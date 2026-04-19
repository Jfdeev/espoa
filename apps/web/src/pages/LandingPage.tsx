import { useState, useEffect } from "react";
import { useScrollReveal } from "../hooks/useScrollReveal";

const HERO_BG =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBHVk5RdVqgBGvtv-viuY3y-vNzRZHZNEkgu3_zI6hg_TWGRDD-Pu_-j3Qw9LY_0jU8binclDR_JjK2bcZ-dVv9N2gFiwfJNInXQ39RfZloHyEob5HNscAkp4q3n6HAS5QIz9t9qJD6yYVy7r_c5iVvfFHyozZwC1iMwwyAPbTZq8Fyv0YdUulDWM_zkplIn8ERW9J6JtSuGBimzwZanWNSO2Ify1O0YwIbu8JYNNzPiZMaD8QWbvDu8EMq2a40wl_Yql5tPJxdT09x";

const DASHBOARD_IMG =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuATURYJwzmVAO-C1VjMWV-4lt8QQ9gJOSTWKxI9SmrUNkTDXtVMXv6rvSTLNfvY5PT8GzuX8JkMqsGS_ZHfVAA0Gg8Rk9p4ZKOST02_pqMsnus22NxXVDf55Dk4LCQGhvalQ-ZdhcbrkA2Qh2-0k2gowsO-QtFh0xJC_l6W6laYYZm36git9QEhjSfD3M_B2jhFX5WuXqz-64PORj7sW_ANbFNAem2H-fKR9QnX3_zHg5PESlRHmzmnYHMfvVE3Z98iez3X2VxFvO5f";

const NAV_LINKS = [
  { label: "Associação", href: "#associacao", active: true },
  { label: "Sobre", href: "#sobre" },
  { label: "Solução", href: "#solucao" },
  { label: "Funcionalidades", href: "#funcionalidades" },
  { label: "Recursos", href: "#recursos" },
];

const PROBLEMS = [
  {
    icon: "inventory_2",
    title: "Gestão de Dados Fragmentada",
    text: "Planilhas físicas e anotações soltas impedem uma visão clara do potencial produtivo da região.",
  },
  {
    icon: "distance",
    title: "Dificuldade Logística",
    text: "A falta de integração entre produtores torna o frete e a distribuição caros e ineficientes.",
  },
  {
    icon: "contract",
    title: "Baixo Poder de Negociação",
    text: "Sem dados consolidados, é difícil garantir contratos com grandes redes ou acessar incentivos.",
  },
];

const SOLUTION_ITEMS = [
  {
    icon: "verified_user",
    text: "Certificação digital de origem para toda colheita.",
  },
  {
    icon: "analytics",
    text: "Dashboard centralizado para diretores de associações.",
  },
  { icon: "hub", text: "Integração direta com cooperativas de crédito." },
];

const FEATURES = [
  {
    icon: "sensor_occupied",
    title: "Censo Rural Digital",
    text: "Mapeie cada hectare e perfil de produtor para planejar melhor as safras.",
  },
  {
    icon: "storefront",
    title: "Mercado Interno",
    text: "Compre insumos coletivamente e reduza custos operacionais significativamente.",
  },
  {
    icon: "query_stats",
    title: "Relatórios de Impacto",
    text: "Gere dados para editais públicos e captação de recursos governamentais.",
  },
  {
    icon: "chat_bubble",
    title: "Comunicação Direta",
    text: "Notifique todos os membros sobre reuniões e avisos via SMS e PWA.",
  },
];

const STEPS = [
  {
    number: 1,
    title: "Cadastro Institucional",
    text: "A diretoria cadastra a associação e define os níveis de acesso para os técnicos e produtores.",
  },
  {
    number: 2,
    title: "Onboarding Presencial",
    text: "Nossa equipe realiza o treinamento com os líderes para garantir a adoção plena da plataforma.",
  },
  {
    number: 3,
    title: "Colheita de Resultados",
    text: "Comece a centralizar a produção e a abrir novos canais de venda direto pelo sistema.",
  },
];

export default function LandingPage() {
  const scrollRef = useScrollReveal();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div ref={scrollRef} className="font-body bg-background text-on-surface selection:bg-on-tertiary-container selection:text-white">
      {/* ─── HEADER ─── */}
      <header
        className={`nav-animate fixed top-0 w-full z-50 transition-all duration-300 ${
          scrolled
            ? "bg-background/90 header-scrolled"
            : "bg-background"
        }`}
      >
        <nav className="flex justify-between items-center h-20 px-6 md:px-12 w-full max-w-screen-2xl mx-auto">
          <span
            className="nav-item-animate font-headline text-2xl font-bold text-primary-container"
            style={{ animationDelay: "0.1s" }}
          >
            Espoa
          </span>

          <div className="hidden md:flex gap-10 items-center">
            {NAV_LINKS.map((link, i) => (
              <a
                key={link.label}
                href={link.href}
                className={`nav-item-animate font-headline font-medium text-lg transition-colors ${
                  link.active
                    ? "text-primary-container border-b-2 border-primary-container pb-1"
                    : "text-on-surface/70 hover:text-primary-container"
                }`}
                style={{ animationDelay: `${0.15 + i * 0.07}s` }}
              >
                {link.label}
              </a>
            ))}
          </div>

          <button
            className="nav-item-animate bg-primary-container text-white px-8 py-3 rounded-xl font-medium hover:opacity-80 transition-opacity"
            style={{ animationDelay: "0.55s" }}
          >
            Entre com Google
          </button>
        </nav>
      </header>

      <main>
        {/* ─── HERO ─── */}
        <section className="deep-forest-gradient min-h-[870px] flex items-center relative overflow-hidden pt-20">
          <div className="absolute inset-0 opacity-20">
            <img
              className="w-full h-full object-cover hero-bg-animate"
              src={HERO_BG}
              alt="Vista aérea de colinas verdes com neblina ao amanhecer"
            />
          </div>

          <div className="max-w-screen-2xl mx-auto px-6 md:px-12 w-full grid grid-cols-1 md:grid-cols-2 gap-16 relative z-10">
            <div className="flex flex-col justify-center space-y-8 hero-cascade">
              <h1 className="font-headline text-5xl md:text-7xl text-white leading-tight">
                Sua associação organizada.
                <br />
                <span className="italic text-on-primary-container">
                  Sua produção valorizada.
                </span>
              </h1>

              <p className="text-white/80 text-lg md:text-xl max-w-xl leading-relaxed">
                Potencialize a gestão da sua associação rural com tecnologia
                desenhada para o campo. Do controle de colheita ao acesso a
                novos mercados.
              </p>

              <div className="flex flex-wrap gap-4">
                <button className="bg-on-tertiary-container text-white px-10 py-4 rounded-xl font-bold text-lg hover:scale-105 active:scale-95 transition-transform cta-shimmer">
                  Começar agora
                </button>
                <button className="border border-white/30 text-white px-10 py-4 rounded-xl font-medium text-lg hover:bg-white/10 transition-colors">
                  Ver demonstração
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ─── PROBLEMS ─── */}
        <section id="sobre" className="bg-surface-container-low py-24 md:py-32 px-6 md:px-12">
          <div className="max-w-screen-2xl mx-auto">
            <div className="flex flex-col items-center mb-20 text-center max-w-3xl mx-auto">
              <span className="reveal font-label text-on-secondary-container tracking-[0.2em] mb-4">
                O CENÁRIO ATUAL
              </span>
              <h2 className="reveal font-headline text-4xl text-primary-container">
                Por que as associações perdem valor?
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 stagger-children">
              {PROBLEMS.map((p) => (
                <div
                  key={p.icon}
                  className="reveal bg-surface-container-lowest p-10 rounded-xl space-y-6 feature-card"
                >
                  <div className="w-16 h-16 bg-surface-container flex items-center justify-center rounded-xl text-primary">
                    <span className="material-symbols-outlined text-4xl feature-icon">
                      {p.icon}
                    </span>
                  </div>
                  <h3 className="font-headline text-2xl text-primary">
                    {p.title}
                  </h3>
                  <p className="text-on-surface-variant leading-relaxed">
                    {p.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── SOLUTION ─── */}
        <section id="solucao" className="bg-primary-container py-24 md:py-32 px-6 md:px-12 relative overflow-hidden">

          <div className="max-w-screen-2xl mx-auto flex flex-col md:flex-row gap-20 items-center">
            <div className="md:w-1/2 space-y-8">
              <span className="reveal font-label text-on-primary-container tracking-[0.2em]">
                A SOLUÇÃO ESPOA
              </span>
              <h2 className="reveal font-headline text-5xl text-white leading-tight">
                Uma plataforma institucional para o campo moderno.
              </h2>
              <p className="reveal text-white/70 text-xl leading-relaxed">
                Criamos um ecossistema digital que conecta o produtor à
                associação e a associação ao mercado, garantindo transparência e
                eficiência em cada etapa.
              </p>
              <ul className="space-y-6">
                {SOLUTION_ITEMS.map((item, i) => (
                  <li
                    key={item.icon}
                    className="reveal flex items-center gap-4 text-white"
                    style={{ transitionDelay: `${i * 100}ms` }}
                  >
                    <span className="material-symbols-outlined text-on-tertiary-container">
                      {item.icon}
                    </span>
                    <span className="text-lg">{item.text}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="md:w-1/2 reveal-right">
              <div className="bg-surface-container-low p-4 rounded-[2rem] shadow-2xl float-animation">
                <img
                  className="rounded-[1.5rem] w-full"
                  src={DASHBOARD_IMG}
                  alt="Interface de dashboard de gestão rural em tablet"
                />
              </div>
            </div>
          </div>
        </section>

        {/* ─── FEATURES ─── */}
        <section id="funcionalidades" className="bg-background py-24 md:py-32 px-6 md:px-12">
          <div className="max-w-screen-2xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8">
              <div className="max-w-2xl">
                <h2 className="reveal font-headline text-5xl text-primary mb-6">
                  Ferramentas que geram crescimento.
                </h2>
                <p className="reveal text-on-surface-variant text-lg leading-relaxed">
                  Desenvolvido com foco na usabilidade, o Espoa funciona
                  perfeitamente mesmo em áreas com baixa conectividade.
                </p>
              </div>
              <button className="reveal bg-primary text-white px-8 py-4 rounded-xl font-medium hover:opacity-90 transition-opacity">
                Ver todas as funcionalidades
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 stagger-children">
              {FEATURES.map((f) => (
                <div
                  key={f.icon}
                  className="reveal feature-card bg-surface-container-low p-8 rounded-xl border border-outline-variant/10 hover:bg-white"
                >
                  <span className="material-symbols-outlined text-4xl text-primary mb-6 block feature-icon">
                    {f.icon}
                  </span>
                  <h4 className="font-headline text-xl text-primary mb-4">
                    {f.title}
                  </h4>
                  <p className="text-on-surface-variant text-sm leading-relaxed">
                    {f.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── STEPS ─── */}
        <section id="recursos" className="bg-surface-container py-24 md:py-32 px-6 md:px-12">
          <div className="max-w-screen-2xl mx-auto">
            <h2 className="reveal font-headline text-4xl text-center mb-20 text-primary">
              Como implementar o Espoa?
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              {STEPS.map((s, i) => (
                <div
                  key={s.number}
                  className={`reveal relative text-center space-y-6 ${
                    i < STEPS.length - 1 ? "step-connector" : ""
                  }`}
                  style={{ transitionDelay: `${i * 150}ms` }}
                >
                  <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center text-white text-3xl font-bold mx-auto mb-8 step-pulse">
                    {s.number}
                  </div>
                  <h3 className="font-headline text-2xl text-primary">
                    {s.title}
                  </h3>
                  <p className="text-on-surface-variant leading-relaxed">
                    {s.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── CTA ─── */}
        <section className="py-16 md:py-24 px-6 md:px-12">
          <div className="max-w-screen-2xl mx-auto">
            <div className="reveal-scale bg-on-tertiary-container rounded-[2.5rem] p-10 md:p-16 flex flex-col items-center text-center space-y-8 relative overflow-hidden">
              <div className="absolute inset-0 bg-black/5 pointer-events-none" />
              <h2 className="font-headline text-4xl md:text-5xl text-white max-w-3xl leading-tight">
                Pronto para elevar o patamar da sua associação rural?
              </h2>
              <p className="text-white/90 text-xl max-w-2xl">
                Agende uma conversa com nossos especialistas em desenvolvimento
                rural e descubra como o Espoa pode ajudar.
              </p>
              <button className="bg-primary text-white px-12 py-5 rounded-xl font-bold text-xl hover:bg-primary/90 transition-all shadow-xl hover:scale-105 active:scale-95">
                Fazer Login
              </button>
              <p className="text-white/70 font-label tracking-widest text-xs uppercase">
                Sem compromisso. Design para quem produz.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* ─── FOOTER ─── */}
      <footer className="bg-linear-to-br from-[#01261f] to-[#1a3c34] text-[#F5F2ED] w-full py-16 px-6 md:px-12 mt-auto">
        <div className="max-w-screen-2xl mx-auto flex flex-col md:flex-row justify-between items-start gap-8">
          <div className="space-y-6 max-w-sm">
            <div className="font-headline text-3xl text-white">Espoa</div>
            <p className="font-body text-sm tracking-wide leading-relaxed text-[#F5F2ED]/60">
              O Espoa é a plataforma líder em gestão para associações rurais na
              América Latina, focada em sustentabilidade e retorno financeiro ao
              produtor.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-12">
            <div className="flex flex-col gap-4">
              <span className="font-bold text-white mb-2">Plataforma</span>
              <a className="text-[#F5F2ED]/60 hover:text-white hover:translate-x-1 transition-all duration-200" href="#">
                Padrões Agrícolas
              </a>
              <a className="text-[#F5F2ED]/60 hover:text-white hover:translate-x-1 transition-all duration-200" href="#">
                Marketplace
              </a>
              <a className="text-[#F5F2ED]/60 hover:text-white hover:translate-x-1 transition-all duration-200" href="#">
                Escritórios Regionais
              </a>
            </div>
            <div className="flex flex-col gap-4">
              <span className="font-bold text-white mb-2">Suporte</span>
              <a className="text-[#F5F2ED]/60 hover:text-white hover:translate-x-1 transition-all duration-200" href="#">
                Contato
              </a>
              <a className="text-[#F5F2ED]/60 hover:text-white hover:translate-x-1 transition-all duration-200" href="#">
                Termos de Serviço
              </a>
              <a className="text-[#F5F2ED]/60 hover:text-white hover:translate-x-1 transition-all duration-200" href="#">
                Política de Privacidade
              </a>
            </div>
          </div>
        </div>
        <div className="max-w-screen-2xl mx-auto mt-16 pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="font-body text-sm tracking-wide leading-relaxed text-[#F5F2ED]/60">
            © 2026 Espoa — Associação Rural. Cultivando Excelência
            Institucional.
          </p>
          <div className="flex gap-6">
            <a className="text-[#F5F2ED]/60 hover:text-white transition-colors" href="#">
              <span className="material-symbols-outlined">public</span>
            </a>
            <a className="text-[#F5F2ED]/60 hover:text-white transition-colors" href="#">
              <span className="material-symbols-outlined">share</span>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
