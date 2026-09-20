import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { normalizePayload, POLICY_VERSION } from '../supabase/functions/moderate-review/policy.mjs';

// Real PostgreSQL engine, isolated fixtures, no production connection. Load the
// existing payout function unchanged before applying the new gate migration.
test('PostgreSQL: 검수 권한·본문 결합·재시도·보상 원자성', async t => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon; create role authenticated; create role service_role;
      create schema auth; create schema private;
      grant usage on schema public, auth to anon, authenticated, service_role;
      create function auth.uid() returns uuid language sql as
        $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      create table public.users (id uuid primary key, completed_test_count int not null default 2,
        has_passed_gating boolean not null default false, updated_at timestamptz);
      create table public.projects (id uuid primary key, creator_id uuid, reward_coin int, title text,
        quizzes jsonb not null default '[]');
      create table public.participations (id uuid primary key default gen_random_uuid(), project_id uuid,
        user_id uuid, status text default 'in_progress', completed_at timestamptz);
      create table public.reviews (id uuid primary key default gen_random_uuid(), project_id uuid,
        participation_id uuid unique not null, user_id uuid, rating numeric, reuse_intention boolean,
        answers jsonb, quiz_answers jsonb, is_quiz_passed boolean, screenshot_url text,
        status text, creator_reply text, creator_replied_at timestamptz);
      create table public.coin_wallets (user_id uuid primary key, earned_coins int not null default 0,
        paid_coins int not null default 0, updated_at timestamptz);
      create table public.coin_transactions (id uuid primary key default gen_random_uuid(), user_id uuid,
        amount int, coin_type text, type text, description text, reference_type text, reference_id uuid);
      create unique index coin_reference_once on public.coin_transactions(user_id, type, reference_id, coin_type);
    `);
    for (const filename of ['20260916140000_welcome_bonus_on_gating_pass.sql', '20260920200000_reconcile_review_verification.sql', '20260920210000_require_review_moderation.sql', '20260920220000_fix_review_screenshot_evidence.sql']) {
      await db.exec(readFileSync(new URL(`../supabase/migrations/${filename}`, import.meta.url), 'utf8'));
    }

    async function asRole(role, userId, action) {
      await db.query("select set_config('request.jwt.claim.sub', $1, false)", [userId || '']);
      await db.exec(`set role ${role}`);
      try { return await action(); } finally { await db.exec('reset role'); }
    }
    async function setup({ screenshot = null, verificationMethod = 'none', quizzes = [], quizAnswers = {} } = {}) {
      const userId = crypto.randomUUID();
      const projectId = crypto.randomUUID();
      await db.query('insert into public.users(id) values ($1)', [userId]);
      await db.query("insert into public.projects(id, creator_id, reward_coin, title, verification_method, quizzes) values ($1, $2, 100, '테스트', $3, $4::jsonb)", [projectId, crypto.randomUUID(), verificationMethod, JSON.stringify(quizzes)]);
      await db.query('insert into public.participations(project_id, user_id) values ($1, $2)', [projectId, userId]);
      const payload = normalizePayload({ p_project_id: projectId, p_rating: 1, p_answers: { review_text: '불편해요' }, p_screenshot_url: screenshot, p_quiz_answers: quizAnswers });
      const begin = () => asRole('service_role', null, async () => (await db.query(
        'select public.begin_review_moderation($1, $2::jsonb, $3) as id', [userId, JSON.stringify(payload), POLICY_VERSION]
      )).rows[0].id);
      const finish = (id, decision = 'pass', categories = []) => asRole('service_role', null, () => db.query(
        'select public.finish_review_moderation($1, $2, $3::text[], $4)', [id, decision, categories, 'claude-5-sonnet']
      ));
      const submit = (id, changes = {}, caller = userId) => {
        const value = { ...payload, ...changes };
        return asRole('authenticated', caller, async () => (await db.query(
          'select public.submit_project_review($1, $2, $3, $4::jsonb, $5::jsonb, $6, $7, $8) as result',
          [value.p_project_id, value.p_rating, value.p_reuse_intention, JSON.stringify(value.p_answers), JSON.stringify(value.p_quiz_answers), value.p_is_quiz_passed, value.p_screenshot_url, id]
        )).rows[0].result);
      };
      const balance = async () => (await db.query('select coalesce(sum(amount), 0)::int as total from public.coin_transactions where user_id = $1', [userId])).rows[0].total;
      return { userId, payload, begin, finish, submit, balance };
    }

    await t.test('클라이언트가 승인 기록 생성·수정 및 비검수 함수 호출을 할 수 없다', async () => {
      const state = await setup();
      const checks = await db.query(`select
        has_function_privilege('authenticated', 'public.begin_review_moderation(uuid,jsonb,text)', 'execute') as can_begin,
        has_function_privilege('authenticated', 'public.finish_review_moderation(uuid,text,text[],text)', 'execute') as can_finish,
        has_function_privilege('authenticated', 'private.submit_project_review(uuid,numeric,boolean,jsonb,jsonb,boolean,text)', 'execute') as can_bypass,
        has_table_privilege('authenticated', 'private.review_moderation_attempts', 'select') as can_read_audit,
        has_table_privilege('authenticated', 'public.reviews', 'insert') as can_insert,
        has_column_privilege('authenticated', 'public.reviews', 'answers', 'update') as can_edit,
        has_column_privilege('authenticated', 'public.reviews', 'creator_reply', 'update') as can_reply`);
      assert.deepEqual(checks.rows[0], { can_begin: false, can_finish: false, can_bypass: false, can_read_audit: false, can_insert: false, can_edit: false, can_reply: true });
      await assert.rejects(state.submit(null), /review moderation required/);
      await assert.rejects(asRole('authenticated', state.userId, () => db.query(
        'select public.begin_review_moderation($1, $2, $3)', [state.userId, JSON.stringify(state.payload), POLICY_VERSION]
      )), /permission denied/);
      assert.equal(await state.balance(), 0);
    });

    await t.test('대기·거절·판단 보류·실패에는 보상이 없다', async () => {
      for (const decision of ['pending', 'revise', 'uncertain', 'error']) {
        const state = await setup();
        const id = await state.begin();
        if (decision !== 'pending') await state.finish(id, decision, decision === 'revise' ? ['phone'] : []);
        await assert.rejects(state.submit(id), /review moderation pass required/);
        assert.equal(await state.balance(), 0);
      }
    });

    await t.test('승인 후 본문·별점·사용자를 바꾸거나 만료된 승인을 재사용할 수 없다', async () => {
      const state = await setup();
      const id = await state.begin();
      await state.finish(id);
      await assert.rejects(state.submit(id, { p_answers: { review_text: '다른 내용' } }), /payload mismatch/);
      await assert.rejects(state.submit(id, { p_rating: 5 }), /payload mismatch/);
      await assert.rejects(state.submit(id, {}, crypto.randomUUID()), /payload mismatch/);
      await db.query("update private.review_moderation_attempts set created_at = now() - interval '6 minutes' where id = $1", [id]);
      await assert.rejects(state.submit(id), /review moderation pass required/);
      assert.equal(await state.balance(), 0);
    });

    await t.test('정상 제출·같은 승인 재시도·서로 다른 승인 경쟁에도 보상은 한 번이다', async () => {
      const state = await setup();
      const first = await state.begin();
      const second = await state.begin();
      await state.finish(first);
      await state.finish(second);
      const result = await state.submit(first);
      assert.equal(result.reward_amount, 100);
      assert.equal(result.welcome_bonus_amount, 500);
      assert.equal(result.completed_test_count, 3);
      assert.deepEqual(await state.submit(first), result);
      await assert.rejects(state.submit(second), /already submitted/);
      assert.equal(await state.balance(), 600);
      assert.equal((await db.query('select count(*)::int as count from public.reviews where user_id = $1', [state.userId])).rows[0].count, 1);
    });

    await t.test('저장 트랜잭션 오류 시 승인 소비·리뷰·코인 모두 되돌린다', async () => {
      const state = await setup();
      const id = await state.begin();
      await state.finish(id);
      await db.exec(`create function private.fail_test_payout() returns trigger language plpgsql as $$ begin raise exception 'test payout failure'; end $$;
        create trigger fail_test_payout before insert on public.coin_transactions for each row execute function private.fail_test_payout();`);
      try { await assert.rejects(state.submit(id), /test payout failure/); }
      finally { await db.exec('drop trigger fail_test_payout on public.coin_transactions'); }
      assert.equal(await state.balance(), 0);
      assert.equal((await db.query('select count(*)::int as count from public.reviews where user_id = $1', [state.userId])).rows[0].count, 0);
      assert.equal((await db.query('select decision from private.review_moderation_attempts where id = $1', [id])).rows[0].decision, 'pass');
      assert.equal((await state.submit(id)).reward_amount, 100);
    });

    await t.test('사용자별 요청 제한과 확정된 판정 덮어쓰기 차단', async () => {
      const state = await setup();
      const id = await state.begin();
      await state.finish(id, 'revise', ['profanity']);
      await assert.rejects(state.finish(id), /expired or finalized/);
      for (let index = 0; index < 4; index++) await state.begin();
      await assert.rejects(state.begin(), /review moderation rate limit/);
    });

    await t.test('첨부 이미지와 HTTPS 증빙은 검수 통과 후 저장되고 보상은 한 번 지급된다', async () => {
      const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a1ZkAAAAASUVORK5CYII=';
      for (const screenshot of [`data:image/png;base64,${png}`, 'https://example.com/proof.png']) {
        const state = await setup({ screenshot, verificationMethod: 'screenshot' });
        const id = await state.begin();
        await state.finish(id);
        const result = await state.submit(id);
        assert.equal(result.reward_amount, 100);
        assert.equal(await state.balance(), 600);
        assert.deepEqual(await state.submit(id), result);
        const stored = await db.query('select screenshot_url from public.reviews where id = $1', [result.review_id]);
        assert.equal(stored.rows[0].screenshot_url, screenshot);
      }
    });

    await t.test('증빙 누락·용량 초과·금지된 형식·깨진 base64에는 리뷰와 보상이 없다', async () => {
      const tooLarge = `data:image/png;base64,${Buffer.alloc(2097153).toString('base64')}`;
      for (const screenshot of [null, tooLarge, 'data:image/svg+xml;base64,PHN2Zz4=', 'data:image/png;base64,AAAA=', 'https://example.com/' + 'x'.repeat(2048)]) {
        const state = await setup({ verificationMethod: 'screenshot' });
        // Simulate the database boundary as well as the Edge input validator.
        state.payload.p_screenshot_url = screenshot;
        const id = await state.begin();
        await state.finish(id);
        await assert.rejects(state.submit(id), /screenshot (?:URL is invalid|is required)/);
        assert.equal(await state.balance(), 0);
        assert.equal((await db.query('select count(*)::int as count from public.reviews where user_id = $1', [state.userId])).rows[0].count, 0);
      }
    });

    await t.test('2MB 이미지 경계와 검증 미사용·퀴즈 검증의 기존 규칙을 유지한다', async () => {
      const boundary = `data:image/png;base64,${Buffer.alloc(2097152).toString('base64')}`;
      assert.equal((await db.query('select private.is_valid_review_screenshot($1) as valid', [boundary])).rows[0].valid, true);
      for (const answer of ['wrong', '정답']) {
        const state = await setup({ verificationMethod: 'quiz', quizzes: [{ question: '확인 질문', answer: '정답' }], quizAnswers: { quiz_1: answer } });
        const id = await state.begin();
        await state.finish(id);
        if (answer === 'wrong') {
          await assert.rejects(state.submit(id), /quiz answer is incorrect/);
          assert.equal(await state.balance(), 0);
        } else assert.equal((await state.submit(id)).reward_amount, 100);
      }
    });
  } finally { await db.close(); }
});
