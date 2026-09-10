import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Script } from 'node:vm';

import {
  COIN_TRANSACTION_COLUMNS,
  COIN_WALLET_COLUMNS,
  MARKETPLACE_EXCHANGE_COLUMNS,
  SUPPORT_TICKET_COLUMNS,
  prepareProfileLinks,
  prepareSupportTicketPayload
} from '../src/dataService.js';

test('프로필 링크를 HTTPS URL로 정규화하고 중복을 제거한다', () => {
  assert.deepEqual(
    prepareProfileLinks([' example.com/profile ', 'https://example.com/profile', '']),
    ['https://example.com/profile']
  );
});

test('프로필 링크는 위험한 스킴과 5개 초과 입력을 거부한다', () => {
  assert.throws(() => prepareProfileLinks(['javascript:alert(1)']), /http:\/\/ 또는 https:\/\//);
  assert.throws(
    () => prepareProfileLinks(Array.from({ length: 6 }, (_, index) => `https://example.com/${index}`)),
    /최대 5개/
  );
});

test('고객센터 문의 payload는 허용 필드만 정리한다', () => {
  assert.deepEqual(prepareSupportTicketPayload({
    category: ' bug ',
    subject: '  로그인 오류  ',
    message: '  재현 절차입니다.  ',
    user_id: 'other-user',
    status: 'answered',
    admin_reply: 'forged'
  }), {
    category: 'bug',
    subject: '로그인 오류',
    message: '재현 절차입니다.'
  });
});

test('빈 문의와 허용되지 않은 문의 유형을 거부한다', () => {
  assert.throws(() => prepareSupportTicketPayload({ category: 'admin', subject: 'a', message: 'b' }), /유형/);
  assert.throws(() => prepareSupportTicketPayload({ category: 'other', subject: '', message: 'b' }), /제목/);
  assert.throws(() => prepareSupportTicketPayload({ category: 'other', subject: 'a', message: '' }), /내용/);
});

test('내 정보 조회 목록은 필요한 컬럼만 명시한다', () => {
  assert.equal(COIN_WALLET_COLUMNS, 'user_id,earned_coins,paid_coins,updated_at');
  assert.equal(COIN_TRANSACTION_COLUMNS.includes('description'), true);
  assert.equal(MARKETPLACE_EXCHANGE_COLUMNS.includes('voucher_code'), false);
  assert.equal(SUPPORT_TICKET_COLUMNS.includes('admin_reply'), true);
});

test('마이페이지 UI는 실제 DB 연결 지점과 고객센터 화면을 포함한다', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.equal(html.includes('fetchMyPrivateProfile()'), true);
  assert.equal(html.includes('updateMyPrivateProfile({'), true);
  assert.equal(html.includes('fetchUserExchanges(userId)'), true);
  assert.equal(html.includes('id="mypage-support-section"'), true);
  assert.equal(html.includes("showSidebarFeatureNotice('고객센터'"), false);
  assert.equal(html.includes('admin001@dondwae.io'), false);
});

test('스키마는 고객센터 RLS와 private profile RPC 권한을 선언한다', () => {
  const schema = readFileSync(new URL('../supabase_schema.sql', import.meta.url), 'utf8');
  assert.match(schema, /ALTER TABLE public\.support_tickets ENABLE ROW LEVEL SECURITY/i);
  assert.match(schema, /Users view own support tickets/);
  assert.match(schema, /Users create own support tickets/);
  assert.match(schema, /CREATE OR REPLACE FUNCTION public\.get_my_private_profile\(\)/i);
  assert.match(schema, /GRANT EXECUTE ON FUNCTION public\.update_my_private_profile/i);
});

test('인라인 브라우저 스크립트에 문법 오류가 없다', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const inlineScripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)];
  assert.ok(inlineScripts.length > 0);
  inlineScripts.forEach((match, index) => {
    assert.doesNotThrow(() => new Script(match[1], { filename: `index-inline-${index}.js` }));
  });
});
