-- Load the supplied legal drafts and prepare the authenticated terms gate.
-- Draft rows remain invisible until a reviewed migration publishes them.

BEGIN;

INSERT INTO public.terms_documents (
  document_type,
  version,
  title,
  content,
  is_required
)
VALUES
(
  'terms_of_service',
  'draft-2026-09-14',
  '돈돼? 서비스 이용약관 (초안)',
  $terms_of_service$
돈돼? 서비스 이용약관 (초안)

⚠️ 본 문서는 표준약관 및 관련 법령(전자상거래법, 정보통신망법 등)을 참고하여 작성한 초안입니다. 실제 서비스 적용 전 반드시 법률 전문가의 검토를 받으시기 바랍니다. [ ] 표시된 항목은 사업자등록 완료 후 실제 정보로 채워 넣어야 합니다.

제1조 (목적)
이 약관은 상호명이 운영하는 서비스 검증 플랫폼 "돈돼?"(이하 "서비스")의 이용과 관련하여 회사와 이용자 간의 권리, 의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.

제2조 (정의)
"서비스"란 서비스 제작자가 자신이 만든 프로덕트, 프로토타입, 투표, 설문 등을 등록하고, 테스터가 이를 체험하고 피드백(리뷰)을 제공하는 대가로 코인을 지급받으며, 코인을 내부 마켓플레이스에서 기프티콘 등으로 교환할 수 있도록 하는 일체의 서비스를 말합니다.
"이용자"란 이 약관에 따라 회사가 제공하는 서비스를 이용하는 회원을 말합니다.
"제작자"란 자신이 만든 서비스(테스트)를 등록하여 검증을 요청하는 이용자를 말합니다.
"테스터"란 등록된 테스트에 참여하여 피드백을 제공하는 이용자를 말합니다. 하나의 계정은 제작자와 테스터 역할을 모두 수행할 수 있습니다.
"코인"이란 테스터가 테스트 참여 및 리뷰 작성의 대가로 지급받는 서비스 내 가상의 재화로서, 현금으로 환급되지 않으며 회사가 정한 내부 마켓플레이스에서만 사용할 수 있습니다.
"포인트"란 제작자가 재게시(2회차 이후 테스트 등록)를 위해 실제 현금 결제를 통해 구매하는 서비스 내 유상 재화를 말하며, 코인과는 별도로 관리되고 상호 교환되지 않습니다.

제3조 (약관의 효력 및 변경)
이 약관은 서비스 화면에 게시하거나 기타의 방법으로 이용자에게 공지함으로써 효력을 발생합니다.
회사는 관련 법령을 위배하지 않는 범위에서 이 약관을 개정할 수 있으며, 개정 시 적용일자 및 개정사유를 명시하여 최소 7일(이용자에게 불리한 변경의 경우 30일) 전부터 공지합니다.
이용자가 개정 약관에 동의하지 않는 경우 서비스 이용을 중단하고 탈퇴할 수 있으며, 공지 후에도 서비스를 계속 이용하는 경우 개정 약관에 동의한 것으로 봅니다.

제4조 (회원가입 및 계정)
회원가입은 구글(Google) 계정을 통한 소셜 로그인 방식으로만 진행하며, 별도의 이메일/비밀번호 가입은 지원하지 않습니다.
회사는 구글 계정에서 제공받는 이메일, 이름, 프로필 사진 정보를 활용하여 회원 식별을 진행하며, 최초 가입 시 추가로 생년월일, 전화번호, 관심사 등의 정보를 수집합니다.
만 14세 미만 아동은 서비스에 가입할 수 없습니다. [ 만 14세~19세 미만 이용자의 경우 법정대리인 동의 절차 확정 필요 ]
이용자는 본인의 계정을 제3자에게 양도, 대여할 수 없습니다.

제5조 (서비스의 내용)
회사가 제공하는 서비스는 다음과 같습니다.
테스트(프로덕트, 프로토타입, 투표, 설문조사) 등록 및 탐색 기능
테스트 참여 및 리뷰(피드백) 작성 기능
리뷰 작성에 대한 코인 지급 기능
코인을 활용한 내부 마켓플레이스(기프티콘 등 교환) 기능
제작자의 재게시를 위한 포인트 구매(결제) 기능
기타 회사가 정하는 부가 서비스
회사는 서비스의 내용, 운영상 또는 기술상 필요에 따라 제공하는 서비스의 전부 또는 일부를 변경할 수 있으며, 변경 시 사전에 공지합니다.
회사는 시스템 점검, 교체 및 고장, 통신 두절 또는 운영상 상당한 이유가 있는 경우 서비스 제공을 일시적으로 중단할 수 있습니다.

제6조 (코인 및 포인트 정책)
코인은 테스터가 테스트 참여 및 리뷰 제출을 완료한 경우에 한하여 지급되며, 회사가 별도로 정한 화폐 정책 및 유형별 단가 기준에 따라 차등 지급됩니다.
코인은 다음과 같은 특성을 가집니다.
코인은 참여 활동을 통해서만 획득할 수 있으며, 이용자가 금전으로 직접 구매할 수 없습니다.
코인은 현금, 상품권 등으로 직접 환급되지 않으며, 회사가 정한 내부 마켓플레이스에서 정해진 품목(기프티콘 등)으로만 교환할 수 있습니다.
코인은 이용자 탈퇴, 부정 참여 적발 등의 사유로 소멸될 수 있습니다.
포인트는 제작자가 실제 현금 결제를 통해 구매하는 유상 재화로서, 테스트 재게시(2회차 이후 등록) 용도로만 사용할 수 있습니다.
포인트의 환불 정책은 관련 법령(전자상거래법 등)에 따라 별도로 정하며, 서비스 내 결제 화면에 명시합니다. [ 환불 정책 세부 확정 필요 ]
회사는 부정한 방법으로 코인 또는 포인트를 취득하거나 사용한 것으로 확인되는 경우, 해당 코인·포인트를 회수하고 이용자의 서비스 이용을 제한할 수 있습니다.

제7조 (마켓플레이스 및 기프티콘 교환)
이용자는 보유한 코인으로 회사가 제휴한 마켓플레이스 사업자를 통해 제공되는 기프티콘 등의 품목으로 교환할 수 있습니다.
교환 신청 후 상품권 발급 등 처리 절차상 회사가 정한 소요 시간이 발생할 수 있습니다.
재고 소진, 제휴사 사정 등의 사유로 교환이 지연되거나 처리되지 않을 수 있으며, 이 경우 회사는 해당 코인을 복원 조치합니다.
교환이 완료되어 지급된 기프티콘에 대해서는 원칙적으로 취소 및 환불이 불가합니다.

제8조 (테스트 게시 자격 및 게이팅)
최초로 테스트를 등록하고자 하는 이용자는 다른 이용자가 등록한 테스트에 회사가 정한 횟수 이상 참여를 완료해야 합니다.
2회차 이후 테스트를 등록하고자 하는 이용자는 회사가 정한 방식에 따라 포인트를 보유하고 있어야 하며, 해당 포인트는 실제 결제를 통해 구매해야 합니다.

제9조 (이용자의 의무)
이용자는 다음 각 호의 행위를 하여서는 안 됩니다.
타인의 정보를 도용하거나 허위 정보를 등록하는 행위
회사의 서비스를 이용하여 얻은 정보를 회사의 사전 승낙 없이 복제, 유통, 조장하거나 상업적으로 이용하는 행위
코인 또는 포인트를 부정한 방법으로 취득하거나, 리뷰를 성의 없이 반복 작성하여 코인을 부정 취득하는 행위
검증 항목과 무관한 허위 리뷰를 작성하는 행위
타인이 등록한 아이디어나 서비스 정보를 무단으로 도용, 유출, 모방하는 행위
기타 관련 법령 또는 회사가 정한 이용 정책에 위배되는 행위
회사는 제1항을 위반한 이용자에 대해 경고, 서비스 이용 제한, 코인·포인트 회수, 계약 해지 등의 조치를 취할 수 있습니다.

제10조 (게시물의 관리 및 지식재산권)
제작자가 등록한 테스트 정보(서비스명, 소개, 검증항목 등) 및 테스터가 작성한 리뷰에 대한 저작권은 해당 게시물을 작성한 이용자에게 귀속됩니다.
이용자는 서비스에 게시물을 등록함으로써, 회사가 서비스의 운영, 개선, 홍보를 위하여 해당 게시물을 저장, 복제, 수정, 공개하는 것에 동의한 것으로 봅니다.
회사는 이용자가 등록한 게시물이 타인의 지식재산권을 침해하거나 관련 법령에 위배된다고 판단하는 경우 사전 통지 없이 삭제하거나 게시 중단 조치를 취할 수 있습니다.
제작자가 등록한 서비스 아이디어에 대한 별도의 저작권·특허 등 보호는 회사가 보장하지 않으며, 제작자는 이를 인지하고 스스로 필요한 보호 조치를 취할 책임이 있습니다.

제11조 (계약 해지 및 이용 제한)
이용자는 언제든지 서비스 내 탈퇴 기능을 통해 이용 계약을 해지할 수 있습니다.
회사는 이용자가 이 약관을 위반하거나 서비스의 정상적인 운영을 방해한 경우, 사전 통지 후(긴급한 경우 사후 통지) 이용 계약을 해지하거나 서비스 이용을 제한할 수 있습니다.
탈퇴 시 보유 코인 및 포인트는 소멸되며, 이미 결제한 포인트에 대한 환불은 관련 법령 및 회사의 환불 정책에 따릅니다.

제12조 (면책조항)
회사는 천재지변, 정전, 서비스 설비의 장애 등 불가항력으로 인하여 서비스를 제공할 수 없는 경우 책임이 면제됩니다.
회사는 제작자가 등록한 테스트(외부 서비스)의 내용, 안전성, 적법성에 대해 보증하지 않으며, 이용자가 외부 서비스를 이용하는 과정에서 발생한 손해에 대해 책임을 지지 않습니다.
회사는 이용자 상호간 또는 이용자와 제3자 상호간에 서비스를 매개로 발생한 분쟁에 대해 개입할 의무가 없으며, 이로 인한 손해를 배상할 책임이 없습니다.
회사는 이용자가 서비스를 통해 얻은 정보나 자료로 인해 발생한 손해에 대해 책임을 지지 않습니다.

제13조 (분쟁 해결)
회사와 이용자 간에 발생한 분쟁에 대해서는 대한민국 법을 준거법으로 합니다.
회사와 이용자 간 발생한 분쟁에 관한 소송은 민사소송법상의 관할법원에 제기합니다.

부칙
이 약관은 [ ]년 [ ]월 [ ]일부터 시행합니다.
  $terms_of_service$,
  TRUE
),
(
  'privacy_policy',
  'draft-2026-09-14',
  '돈돼? 개인정보 처리방침 (초안)',
  $privacy_policy$
돈돼? 개인정보 처리방침 (초안)

⚠️ 본 문서는 개인정보보호법 등 관련 법령을 참고하여 작성한 초안입니다. 실제 서비스 적용 전 반드시 법률 전문가의 검토를 받으시기 바랍니다. [ ] 표시된 항목은 사업자등록 및 서비스 확정 이후 실제 정보로 채워 넣어야 합니다.

상호명는 이용자의 개인정보를 중요시하며, 「개인정보보호법」 등 관련 법령을 준수하기 위하여 노력하고 있습니다. 회사는 개인정보 처리방침을 통하여 이용자가 제공하는 개인정보가 어떠한 용도와 방식으로 이용되고 있으며, 개인정보보호를 위해 어떠한 조치가 취해지고 있는지 알려드립니다.

1. 수집하는 개인정보 항목 및 수집 방법

가. 수집 항목
구분 | 수집 항목 | 수집 시점
필수(구글 계정 연동) | 이메일, 이름, 프로필 사진 | 회원가입(구글 로그인) 시
필수(온보딩) | 생년월일, 전화번호, 관심사 | 최초 로그인 시
선택 | 닉네임, 한줄소개, SNS 링크 | 프로필 수정 시
서비스 이용 과정에서 생성 | 코인/포인트 거래 내역, 테스트 참여·리뷰 작성 이력, 스크랩·최근 열람 이력 | 서비스 이용 중
결제 관련(제작자, Phase 2 이후) | 결제수단 정보(카드사, 결제승인번호 등은 PG사가 직접 처리) | 포인트 구매 시
기프티콘 교환 관련 | 교환 대상 상품 정보, 발급된 기프티콘 코드 | 마켓플레이스 이용 시
자동 수집 항목 | 접속 IP, 쿠키, 서비스 이용 기록, 기기 정보 | 서비스 이용 시 자동 생성

나. 수집 방법
구글 소셜 로그인을 통한 수집
온보딩 및 프로필 수정 화면을 통한 이용자 직접 입력
서비스 이용 과정에서 자동으로 생성·수집(Google Analytics(GA4) 등 로그 분석 도구 포함)

2. 개인정보의 수집 및 이용 목적
회사는 수집한 개인정보를 다음의 목적을 위해 활용합니다.
회원 가입 의사 확인, 본인 식별·인증, 회원 자격 유지·관리
테스트 등록·참여·리뷰 작성 등 서비스 제공 및 관심사 기반 맞춤 콘텐츠(테스트 목록) 추천
코인·포인트 적립 및 사용 내역 관리, 마켓플레이스 기프티콘 교환 처리
제작자의 포인트 구매(결제) 처리 및 결제 관련 분쟁 대응(Phase 2 이후)
부정 이용(중복 참여, 성실도 낮은 리뷰 반복 작성 등) 방지 및 서비스 어뷰징 대응
공지사항 전달, 알림 발송(리뷰 등록, 답글, 게시 승인/반려 등)
서비스 이용 통계 분석 및 서비스 개선(GA4 등 분석 도구 활용)
(선택 동의 시) 마케팅 정보 및 이벤트 안내 제공

3. 개인정보의 보유 및 이용 기간
회사는 이용자의 개인정보를 원칙적으로 개인정보의 수집·이용 목적이 달성되면 지체 없이 파기합니다.
다만, 관계 법령의 규정에 의하여 보존할 필요가 있는 경우 회사는 아래와 같이 관계 법령에서 정한 일정한 기간 동안 회원정보를 보관합니다.
보관 항목 | 보관 근거 | 보관 기간
계약 또는 청약철회 등에 관한 기록 | 전자상거래 등에서의 소비자보호에 관한 법률 | 5년
대금결제 및 재화 등의 공급에 관한 기록 | 전자상거래 등에서의 소비자보호에 관한 법률 | 5년
소비자의 불만 또는 분쟁처리에 관한 기록 | 전자상거래 등에서의 소비자보호에 관한 법률 | 3년
표시·광고에 관한 기록 | 전자상거래 등에서의 소비자보호에 관한 법률 | 6개월
로그인 기록 | 통신비밀보호법 | 3개월
회원 탈퇴 시 개인정보는 지체 없이 파기하며, 단 부정 이용 방지를 위해 필요한 최소한의 정보는 위 보유기간 동안 별도 보관할 수 있습니다.

4. 개인정보의 제3자 제공
회사는 이용자의 개인정보를 원칙적으로 외부에 제공하지 않으며, 다만 아래의 경우에는 예외로 합니다.
이용자가 사전에 동의한 경우
법령의 규정에 의거하거나, 수사 목적으로 법령에 정해진 절차와 방법에 따라 수사기관의 요구가 있는 경우
마켓플레이스를 통한 기프티콘 교환 시, 상품권 발급을 위해 필요한 최소한의 정보(교환 신청 내역)를 제휴 기프티콘 발급 사업자(기프티쇼비즈 등)에 제공할 수 있습니다.

5. 개인정보 처리의 위탁
회사는 서비스 향상을 위해 아래와 같이 개인정보 처리 업무를 외부 전문업체에 위탁하고 있습니다.
위탁받는 자 | 위탁업무 내용
구글(Google) | 소셜 로그인 인증
기프티쇼비즈(KT알파) 등 마켓플레이스 제휴사 | 기프티콘 등 상품권 발급 및 전송
PG(결제대행)사 [ 사업자등록 및 PG 계약 완료 후 상호 명시 ] | 포인트 구매 결제 처리
Google Analytics(GA4) | 서비스 이용 통계 분석
[클라우드/서버 운영사 명시 필요, 예: Supabase 등] | 데이터베이스 및 서버 운영·관리
회사는 위탁계약 체결 시 개인정보보호법 관련 조항을 계약서 등에 명시하고, 수탁자가 개인정보를 안전하게 처리하는지를 감독합니다.

6. 정보주체의 권리·의무 및 행사 방법
이용자는 언제든지 등록되어 있는 자신의 개인정보를 조회하거나 수정할 수 있으며, 가입 해지(탈퇴)를 요청할 수 있습니다.
이용자는 개인정보 열람, 정정, 삭제, 처리정지를 요구할 권리가 있으며, 이는 서비스 내 마이페이지 또는 회사가 지정한 방법을 통해 행사할 수 있습니다.
다만, 구글 계정 연동을 통해 수집된 이메일, 생년월일 등 일부 항목은 구글 계정 정보와 동기화되는 특성상 서비스 내에서 직접 수정이 제한될 수 있으며, 이 경우 구글 계정 자체를 통해 관리하셔야 합니다.

7. 개인정보의 파기 절차 및 방법
회사는 개인정보 보유기간의 경과, 처리목적 달성 등 개인정보가 불필요하게 되었을 때에는 지체 없이 해당 개인정보를 파기합니다.
전자적 파일 형태로 저장된 개인정보는 기록을 재생할 수 없는 기술적 방법을 사용하여 삭제하며, 종이 문서에 기록·저장된 개인정보는 분쇄기로 분쇄하거나 소각하여 파기합니다.

8. 개인정보의 안전성 확보 조치
회사는 개인정보의 안전성 확보를 위해 다음과 같은 조치를 취하고 있습니다.
개인정보 암호화: 비밀번호(해당 시), 결제 정보 등 중요 정보는 암호화하여 저장·관리합니다. (Google 로그인 사용으로 자체 비밀번호는 보유하지 않음)
접근 권한 관리: 데이터베이스 접근 권한을 최소화하고, 행 단위 보안 정책(Row Level Security)을 적용하여 이용자 본인의 데이터만 접근 가능하도록 관리합니다.
해킹 등에 대비한 기술적 대책: 보안 프로그램 설치 및 주기적 갱신·점검을 실시합니다.

9. 쿠키(Cookie)의 운영
회사는 서비스 이용 분석 및 맞춤형 서비스 제공을 위해 쿠키를 사용할 수 있습니다. 이용자는 웹 브라우저의 설정을 통해 쿠키 저장을 거부할 수 있으나, 이 경우 서비스 이용에 일부 제한이 발생할 수 있습니다.

10. 만 14세 미만 아동의 개인정보
회사는 원칙적으로 만 14세 미만 아동의 회원가입을 받지 않으며, 만 14세 미만임이 확인될 경우 관련 정보를 삭제하고 이용을 제한합니다. [ 만 14세 이상 미성년자의 법정대리인 동의 절차는 별도 확정 필요 ]

11. 개인정보 보호책임자
회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한 이용자의 불만처리 및 피해구제 등을 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.
개인정보 보호책임자: [ 성명 ]
연락처: [ 이메일 / 전화번호 ]
※ 위 담당부서로 개인정보와 관련한 문의, 불만처리, 피해구제 등에 관한 사항을 문의하실 수 있습니다.

12. 권익침해 구제 방법
이용자는 개인정보침해로 인한 신고나 상담이 필요하신 경우 아래 기관에 문의하실 수 있습니다.
개인정보분쟁조정위원회: (국번없이) 1833-6972 (www.kopico.go.kr)
개인정보침해신고센터: (국번없이) 118 (privacy.kisa.or.kr)
대검찰청 사이버수사과: (국번없이) 1301 (www.spo.go.kr)
경찰청 사이버수사국: (국번없이) 182 (ecrm.cyber.go.kr)

부칙
이 개인정보 처리방침은 [ ]년 [ ]월 [ ]일부터 시행합니다.
  $privacy_policy$,
  TRUE
),
(
  'marketing_consent',
  'draft-2026-09-14',
  '돈돼? 마케팅 정보 수신 동의 (선택)',
  $marketing_consent$
돈돼? 마케팅 정보 수신 동의 (선택)

⚠️ 본 문서는 정보통신망법 등 관련 법령을 참고하여 작성한 초안입니다. 실제 서비스 적용 전 법률 전문가의 검토를 받으시기 바랍니다. 본 동의는 선택 사항이며, 동의하지 않아도 서비스 이용에 제한이 없습니다.

상호명는 「정보통신망 이용촉진 및 정보보호 등에 관한 법률」에 따라, 광고성 정보를 전송하기 전 이용자의 사전 동의를 받고자 합니다.

1. 수집·이용 목적
신규 서비스(테스트) 등록 알림 및 추천
이벤트, 프로모션, 혜택 정보 안내
코인·마켓플레이스 관련 혜택 및 신상품 입고 안내
설문조사 및 서비스 개선을 위한 의견 수렴 요청

2. 수집 항목
이메일, 휴대전화번호(문자/카카오 알림톡 발송 시)

3. 보유 및 이용 기간
회원 탈퇴 시 또는 마케팅 정보 수신 동의 철회 시까지

4. 수신 동의 및 철회
본 동의는 선택 사항이며, 동의하지 않으시더라도 서비스 이용에는 아무런 제한이 없습니다.
이용자는 언제든지 마이페이지 내 '알림 수신 설정' 메뉴 또는 수신한 광고성 정보 내 수신거부 링크를 통해 동의를 철회할 수 있습니다.
동의 철회 후에도 회사는 관련 법령에 따라 필수적으로 안내해야 하는 정보(서비스 운영, 결제, 보안 관련 안내 등)는 계속 발송할 수 있습니다.

5. 동의 여부
☐ 위 내용을 확인하였으며, 마케팅 정보 수신에 동의합니다. (선택)

참고: 온보딩 화면에서는 본 동의 항목을 '서비스 이용약관', '개인정보 처리방침'과 별도의 체크박스로 분리하여, 선택 동의로 명확히 구분해 노출해야 합니다(법적 요건).
  $marketing_consent$,
  FALSE
)
ON CONFLICT (document_type, version) DO NOTHING;

CREATE OR REPLACE FUNCTION public.get_my_terms_requirement_status()
RETURNS JSONB
LANGUAGE PLPGSQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_documents JSONB;
  v_requires_consent BOOLEAN;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501';
  END IF;

  WITH current_documents AS (
    SELECT DISTINCT ON (document.document_type)
      document.id,
      document.document_type,
      document.version,
      document.title,
      document.content,
      document.is_required,
      document.effective_at,
      document.created_at
    FROM public.terms_documents AS document
    WHERE document.published_at IS NOT NULL
      AND document.effective_at IS NOT NULL
      AND document.effective_at <= NOW()
      AND (document.retired_at IS NULL OR document.retired_at > NOW())
    ORDER BY
      document.document_type,
      document.effective_at DESC,
      document.created_at DESC,
      document.id DESC
  )
  SELECT
    COALESCE(
      JSONB_AGG(
        JSONB_BUILD_OBJECT(
          'id', document.id,
          'document_type', document.document_type,
          'version', document.version,
          'title', document.title,
          'content', document.content,
          'is_required', document.is_required,
          'is_accepted', COALESCE(latest.event_type = 'accepted', FALSE)
        )
        ORDER BY document.is_required DESC, document.document_type
      ),
      '[]'::JSONB
    ),
    COALESCE(
      BOOL_OR(
        document.is_required
        AND COALESCE(latest.event_type, '') <> 'accepted'
      ),
      FALSE
    )
  INTO v_documents, v_requires_consent
  FROM current_documents AS document
  LEFT JOIN LATERAL (
    SELECT consent.event_type
    FROM public.user_term_consents AS consent
    WHERE consent.user_id = v_user_id
      AND consent.terms_document_id = document.id
    ORDER BY consent.recorded_at DESC, consent.id DESC
    LIMIT 1
  ) AS latest ON TRUE;

  RETURN JSONB_BUILD_OBJECT(
    'requires_consent', v_requires_consent,
    'documents', v_documents
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.record_my_current_term_consents(
  p_accepted_document_ids UUID[] DEFAULT '{}'::UUID[]
)
RETURNS JSONB
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_accepted_document_ids UUID[] :=
    COALESCE(p_accepted_document_ids, '{}'::UUID[]);
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501';
  END IF;

  IF CARDINALITY(v_accepted_document_ids) > 20 THEN
    RAISE EXCEPTION 'too many terms documents' USING ERRCODE = '22023';
  END IF;

  PERFORM 1
  FROM public.users AS profile
  WHERE profile.id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'profile not found' USING ERRCODE = 'P0002';
  END IF;

  IF EXISTS (
    WITH current_documents AS (
      SELECT DISTINCT ON (document.document_type)
        document.id,
        document.document_type,
        document.effective_at,
        document.created_at
      FROM public.terms_documents AS document
      WHERE document.published_at IS NOT NULL
        AND document.effective_at IS NOT NULL
        AND document.effective_at <= NOW()
        AND (document.retired_at IS NULL OR document.retired_at > NOW())
      ORDER BY
        document.document_type,
        document.effective_at DESC,
        document.created_at DESC,
        document.id DESC
    )
    SELECT 1
    FROM UNNEST(v_accepted_document_ids) AS requested(document_id)
    WHERE requested.document_id IS NULL
      OR NOT EXISTS (
        SELECT 1
        FROM current_documents AS document
        WHERE document.id = requested.document_id
      )
  ) THEN
    RAISE EXCEPTION 'terms document is not currently available'
      USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    WITH current_documents AS (
      SELECT DISTINCT ON (document.document_type)
        document.id,
        document.document_type,
        document.is_required,
        document.effective_at,
        document.created_at
      FROM public.terms_documents AS document
      WHERE document.published_at IS NOT NULL
        AND document.effective_at IS NOT NULL
        AND document.effective_at <= NOW()
        AND (document.retired_at IS NULL OR document.retired_at > NOW())
      ORDER BY
        document.document_type,
        document.effective_at DESC,
        document.created_at DESC,
        document.id DESC
    )
    SELECT 1
    FROM current_documents AS document
    WHERE document.is_required
      AND NOT (document.id = ANY(v_accepted_document_ids))
  ) THEN
    RAISE EXCEPTION 'all required terms must be accepted'
      USING ERRCODE = '22023';
  END IF;

  WITH current_documents AS (
    SELECT DISTINCT ON (document.document_type)
      document.id,
      document.document_type,
      document.effective_at,
      document.created_at
    FROM public.terms_documents AS document
    WHERE document.published_at IS NOT NULL
      AND document.effective_at IS NOT NULL
      AND document.effective_at <= NOW()
      AND (document.retired_at IS NULL OR document.retired_at > NOW())
    ORDER BY
      document.document_type,
      document.effective_at DESC,
      document.created_at DESC,
      document.id DESC
  ),
  desired_events AS (
    SELECT
      document.id AS terms_document_id,
      CASE
        WHEN document.id = ANY(v_accepted_document_ids) THEN 'accepted'
        ELSE 'withdrawn'
      END AS event_type
    FROM current_documents AS document
  )
  INSERT INTO public.user_term_consents (
    user_id,
    terms_document_id,
    event_type,
    collection_point
  )
  SELECT
    v_user_id,
    desired.terms_document_id,
    desired.event_type,
    'terms_gate'
  FROM desired_events AS desired
  LEFT JOIN LATERAL (
    SELECT consent.event_type
    FROM public.user_term_consents AS consent
    WHERE consent.user_id = v_user_id
      AND consent.terms_document_id = desired.terms_document_id
    ORDER BY consent.recorded_at DESC, consent.id DESC
    LIMIT 1
  ) AS latest ON TRUE
  WHERE latest.event_type IS DISTINCT FROM desired.event_type;

  RETURN public.get_my_terms_requirement_status();
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_terms_requirement_status()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_my_current_term_consents(UUID[])
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_terms_requirement_status()
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_my_current_term_consents(UUID[])
  TO authenticated;

COMMENT ON FUNCTION public.get_my_terms_requirement_status() IS
  'Returns current published terms and whether the active user is missing required acceptance.';
COMMENT ON FUNCTION public.record_my_current_term_consents(UUID[]) IS
  'Atomically validates current terms and appends changed acceptance events for the active user.';

COMMIT;
