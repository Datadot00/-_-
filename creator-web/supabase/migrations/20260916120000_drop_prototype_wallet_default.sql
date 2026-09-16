-- 프로토타입 시절 지갑 기본값 제거
--
-- coin_wallets.earned_coins 의 기본값이 1250 이었다. 가입 트리거가 지갑을
-- 값 없이 생성하므로 모든 신규 계정이 원장 근거 없는 1,250 코인을 받았다.
-- 실제로 기존 계정 7개 모두 지갑 잔액이 coin_transactions 합계보다
-- 정확히 1,250 많았다.
--
-- 신규 계정부터 막는다. 기존 잔액은 건드리지 않는다. 원장에 적립 없이
-- 차감만 쌓인 계정이 있어 일괄 차감하면 잔액이 음수가 되기 때문이다.
-- 기존 계정 정합은 별도 작업으로 다룬다.

alter table public.coin_wallets
  alter column earned_coins set default 0;
