import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

function extractFunction(name, nextMarker) {
  const start = html.indexOf(`function ${name}(`);
  const end = html.indexOf(nextMarker, start);
  assert.notEqual(start, -1, `${name} 함수를 찾을 수 없습니다.`);
  assert.notEqual(end, -1, `${name} 함수의 끝을 찾을 수 없습니다.`);
  return html.slice(start, end);
}

test('리워드 예산 카드는 모집인원 → 1인당 코인 → 총 코인 순서로 배치된다', () => {
  const start = html.indexOf('id="reward-budget-calculator"');
  const end = html.indexOf('id="step3-coin-status-banner"', start);
  const calculator = html.slice(start, end);

  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  assert.ok(calculator.indexOf('id="input-target-count"') < calculator.indexOf('id="input-reward-coin"'));
  assert.ok(calculator.indexOf('id="input-reward-coin"') < calculator.indexOf('id="total-cost-coin"'));
  assert.match(calculator, />×<\/div>/);
  assert.match(calculator, />=<\/div>/);
  assert.match(calculator, />1<\/span>[\s\S]*>모집인원<\/label>/);
  assert.match(calculator, />2<\/span>[\s\S]*>1인당 코인<\/label>/);
  assert.match(calculator, />3<\/span>[\s\S]*>총 코인<\/span>/);
});

test('모집인원이나 1인당 코인을 바꾸면 총 코인이 즉시 계산된다', () => {
  const calculateTotalCost = extractFunction('calculateTotalCost', 'async function handleStep3PublishClick');
  const elements = new Map([
    ['input-target-count', { value: '3' }],
    ['input-reward-coin', { value: '70' }],
    ['total-cost-coin', { textContent: '' }],
    ['total-cost-summary', { innerHTML: '', className: '' }],
    ['step3-coin-status-banner', { innerHTML: '', className: '' }],
    ['btn-publish-step3-text', { textContent: '' }],
    ['btn-publish-step3-icon', { textContent: '' }],
    ['btn-publish-test-step3', { className: '' }]
  ]);
  const document = { getElementById: id => elements.get(id) || null };

  new Function('document', 'userCoinBalance', 'isProjectEditMode', 'myCreatedTest', `
    ${calculateTotalCost}
    calculateTotalCost();
  `)(document, 1000, false, null);

  assert.equal(elements.get('total-cost-coin').textContent, '210');
  assert.match(elements.get('total-cost-summary').innerHTML, /3명 × 70코인 = <strong>210코인<\/strong>/);
});

test('테스트 기간에는 결제 모달 없이 예산을 계산한 뒤 바로 게시한다', () => {
  assert.doesNotMatch(html, /id="test-coin-payment-modal"/);
  assert.doesNotMatch(html, /openPaymentModal|executeVirtualPaymentAndPublish|selectPayMethod/);
  assert.match(html, /테스트 기간에는 잔액 부족 여부와 관계없이 결제 모달을 거치지 않고 저장한다/);
  assert.match(html, /await publishNewTestAndReturnToDashboard\(budgetToApply\);/);
});
