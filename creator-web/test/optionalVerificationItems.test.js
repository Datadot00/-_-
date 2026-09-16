import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('검증 항목은 선택 사항으로 표시된다', () => {
  const label = html.slice(
    html.indexOf('4. 검증 항목 작성 (테스트 미션)'),
    html.indexOf('4. 검증 항목 작성 (테스트 미션)') + 400
  );
  assert.doesNotMatch(label, /text-red-500">\*/);
  assert.match(label, /\(선택\)/);
});

test('문항을 하나도 추가하지 않아도 다음 단계로 넘어간다', () => {
  // 개수를 이유로 막던 검사를 없앴는지 확인한다.
  assert.doesNotMatch(html, /검증 문항을 하나 이상 추가해 주세요/);
});

test('쓰다 만 문항은 여전히 막는다', () => {
  // 제목도 보기도 비어 있는 줄은 무시하고, 내용이 들어간 줄만 검사한다.
  assert.match(html, /const title = questionItem\.querySelector\('\.question-title-input'\)\?\.value\.trim\(\);/);
  assert.match(html, /return Boolean\(title\) \|\| filledChoices\.length > 0;/);
  assert.match(html, /검증 문항의 질문 내용을 입력해 주세요/);
  assert.match(html, /객관식 문항의 선택지를 2개 이상 입력해 주세요/);
});

test('비어 있으면 기본 문항을 끼워 넣지 않는다', () => {
  // 제작자가 만들지 않은 질문이 테스터에게 보이면 안 된다.
  assert.doesNotMatch(html, /핵심 기능의 사용 편의성과 UI 가독성은 어떠하셨나요\?/);
  assert.doesNotMatch(html, /서비스의 핵심 기능 및 사용성에 대한 피드백을 작성해 주세요/);
  assert.doesNotMatch(html, /questions\.length \|\| 1/);
  assert.match(html, /hasQuestions \? `검증 문항 \$\{questions\.length\}개` : '추가 검증 문항 없음'/);
  assert.match(html, /제작자가 등록한 추가 검증 문항이 없습니다/);
});

test('문항이 없는 프로젝트의 리뷰 폼은 검증 항목 영역을 완전히 노출하지 않는다', () => {
  assert.doesNotMatch(html, /영수증 OCR 촬영 후 자동 입력된 상호명 인식 정확도/);
  // 검증항목이 있을 때만 검증 문항 영역이 렌더링되고, 비어있으면 아예 노출되지 않는다.
  assert.match(html, /\$\{hasVerificationItems \? `/);
  assert.match(html, /<span>2\. 테스트 미션 검증 문항<\/span>/);
});

test('외부 설문조사 피드백 모달은 더미 문항 없이 종합 의견만 노출한다', () => {
  // 하드코딩된 더미 설문 문항은 제거되어야 한다.
  assert.doesNotMatch(html, /fb-surv-q1/);
  assert.doesNotMatch(html, /해당 서비스를 일주일에 얼마나 자주 이용하시나요\?/);
  assert.doesNotMatch(html, /서비스 사용 시 가장 중요하게 생각하는 요소는\?/);
  // 외부 설문 시 종합 의견 단독 노출
  assert.match(html, /제작자에게 전하고 싶은 종합 의견/);
});

test('참여 모달의 이런 분이면 딱이에요 영역은 하드코딩 텍스트를 제거하고 등록된 대상을 동적으로 반영한다', () => {
  // 초기 HTML에 하드코딩된 연령대/관심사 텍스트가 없어야 한다.
  assert.doesNotMatch(html, /연령대:\s*20대,\s*30대\s*\|\s*관심사:\s*핀테크,\s*자산관리/);
  // 등록된 persona/tech 태그를 기반으로 동적 렌더링하고, 없으면 박스를 숨긴다.
  assert.match(html, /rawPPersona/);
  assert.match(html, /targetBox\.style\.display\s*=\s*'none'/);
  assert.match(html, /targetBox\.style\.display\s*=\s*'flex'/);
});

test('내부 시안 투표 화면은 선택 이유 작성란이 없고 완료 시 별도 피드백 모달 없이 즉시 리워드를 지급한다', () => {
  // 투표 화면에서 '선택하신 이유를 간단히 적어주세요' 영역은 제거되어야 한다.
  assert.doesNotMatch(html, /선택하신 이유를 간단히 적어주세요/);
  assert.doesNotMatch(html, /어떤 요소가 더 와닿았는지 알려주시면 서비스 개선에 큰 도움이 됩니다/);

  // 투표 완료 시 피드백 모달을 열지 않고 바로 제출 및 코인 지급
  assert.match(html, /const isVote = Boolean\(dynamicContent\?\.querySelector\('\[data-internal-vote-option\]'\)\);/);
  assert.match(html, /if \(!isVote\) \{\s*showGenericToast\('검증을 완료했습니다\. 피드백 저장이 완료되면 리워드가 지급됩니다\.', '✍️'\);\s*openFeedbackWriteModal\(pId\);\s*return;\s*\}/);
  assert.match(html, /투표 완료하고 리워드 받기 →/);
});

