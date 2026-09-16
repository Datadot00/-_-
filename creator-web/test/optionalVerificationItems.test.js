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

test('문항이 없는 프로젝트의 리뷰 폼은 프로토타입 샘플 대신 안내를 보여준다', () => {
  assert.doesNotMatch(html, /영수증 OCR 촬영 후 자동 입력된 상호명 인식 정확도/);
  assert.match(html, /제작자가 등록한 검증 문항이 없습니다/);
});

test('리뷰 폼의 검증 문항 라벨에서 필수 표시를 뗀다', () => {
  assert.match(html, /<span>2\. 테스트 미션 검증 문항<\/span>/);
});
