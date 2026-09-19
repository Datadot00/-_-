import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, resolve } from 'node:path';
import { createRuntimeHarness } from './support/runtimeHarness.js';
import { readAppHtml, readAppSource } from './support/readAppHtml.js';

const project = {
  id: '11111111-1111-4111-8111-111111111111', creator_id: 'creator',
  title: '공통 카드 검증', service_name: '서비스', category: 'vote',
  reward_coin: 70, current_count: 2, target_count: 5, status: 'active',
  created_at: '2026-09-19T00:00:00Z'
};

test('공통 피드 카드는 필터 정보·스크랩·후기 상태와 상세 이동을 보존한다', () => {
  const app = createRuntimeHarness();
  app.context.document.createElement = () => ({
    attributes: {}, setAttribute(name, value) { this.attributes[name] = String(value); }
  });
  app.context.myProjectCollections = { registered: [], participated: [project], scraped: [project] };
  let opened;
  app.context.openPostDetail = id => { opened = id; };
  const card = app.context.createFeedProjectCard(project);
  assert.equal(card.attributes['data-category'], 'vote');
  assert.equal(card.attributes['data-reward'], '70');
  assert.equal(card.attributes['data-personal-state'], 'review-needed');
  assert.match(card.innerHTML, /스크랩 해제/);
  assert.match(card.innerHTML, /resumeProjectReview/);
  assert.match(card.innerHTML, /data-thumbnail-slot=/);
  assert.match(card.innerHTML, /3명 남음/);
  card.onclick();
  assert.equal(opened, project.id);
  assert.doesNotMatch(app.context.createFeedProjectCard({ ...project, thumbnail_url: null }).innerHTML, /data-thumbnail-slot=/);
});

test('내 프로젝트 카드는 등록·참여·스크랩별 허용된 버튼을 구분한다', () => {
  const { context } = createRuntimeHarness();
  const owned = context.renderMyProjectCard(project, 'registered');
  const pending = context.renderMyProjectCard(project, 'participated');
  const completed = context.renderMyProjectCard({ ...project, participation_status: 'submitted' }, 'participated');
  const scraped = context.renderMyProjectCard(project, 'scraped');
  assert.match(owned, /openEditPostModal/);
  assert.match(owned, /openFeedbackReport/);
  assert.match(pending, /resumeProjectReview/);
  assert.doesNotMatch(pending, /deleteRegisteredProject/);
  assert.match(completed, /리뷰 제출 완료/);
  assert.doesNotMatch(completed, /resumeProjectReview/);
  assert.match(scraped, /deleteScrapedItem/);
  assert.doesNotMatch(scraped, /openEditPostModal/);
});

test('공통 메뉴·모달을 조립하고 로딩 중 샘플 카드를 노출하지 않는다', () => {
  const html = readAppHtml();
  assert.equal((html.match(/data-service-sidebar-nav/g) || []).length, 6);
  assert.match(html, /ui-modal/);
  assert.doesNotMatch(html, /home-card-moneylog-thumbnail/);
  const initialGrid = html.match(/<section id="dashboard-cards-grid"[\s\S]*?<\/section>/)[0];
  assert.doesNotMatch(initialGrid, /<article/);
  for (const match of html.matchAll(/class="([^"]*\bui-modal\b[^"]*)"/g)) {
    assert.match(match[1], /\bhidden\b/);
    assert.match(match[1], /\bflex\b/);
  }
});

test('서비스·참고 프로토타입의 로컬 이미지 참조가 실제 원본에 연결된다', () => {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const source = readAppSource() + readdirSync(join(root, 'src'), { recursive: true })
    .filter(file => file.endsWith('.js'))
    .map(file => readFileSync(join(root, 'src', file), 'utf8')).join('\n');
  const paths = new Set([...source.matchAll(/\/images\/(?:brand|mascots)\/[\w.-]+\.png/g)].map(match => match[0]));
  assert.equal(paths.size, 5);
  for (const path of paths) assert.ok(existsSync(join(root, 'public', path)), path);
  assert.doesNotMatch(source, /["']\/(?:logo-default|logo-coin|penny-logo-circle|mascot-full|mascot-hungry)\.png/);
  for (const prototype of ['../index(mode).html', '../tester-mobile/index.html']) {
    const file = resolve(root, prototype);
    const html = readFileSync(file, 'utf8');
    for (const match of html.matchAll(/(?:src|href)="([^"#]+\.png)"/g)) {
      if (!/^https?:/.test(match[1])) assert.ok(existsSync(resolve(file, '..', match[1])), match[1]);
    }
  }
});
