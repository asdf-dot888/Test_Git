interface AuthConfigurationPageProps {
  missing?: string[];
  error?: string;
}

export function AuthConfigurationPage({ missing = [], error }: AuthConfigurationPageProps) {
  return (
    <main className="auth-screen">
      <section className="auth-card" role={error ? "alert" : undefined}>
        <span className="eyebrow">MICROSOFT ENTRA ID</span>
        <h1>로그인 설정이 필요합니다</h1>
        {error ? <p>{error}</p> : <>
          <p>사내 계정 로그인을 시작하기 전에 아래 환경 변수를 설정하세요.</p>
          <ul>{missing.map((key) => <li key={key}><code>{key}</code></li>)}</ul>
          <p className="auth-note">Tenant ID와 SPA client ID를 설정하고, Entra 앱 등록의 SPA 리디렉션 URI에 현재 접속 주소를 추가하세요. 게임 진행 정보는 이 브라우저에 저장됩니다.</p>
        </>}
      </section>
    </main>
  );
}
