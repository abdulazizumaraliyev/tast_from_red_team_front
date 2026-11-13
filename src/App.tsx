import { useEffect, useState } from "react";

import { dataApi } from "./lib/api";
import { useAuth } from "./lib/auth";
import { readPageFromHash, writePageToHash, type Page } from "./lib/navigation";
import { Sidebar, Topbar } from "./components/layout";
import { Logo } from "./components/ui";
import { Auth } from "./pages/auth";
import { Dashboard } from "./pages/dashboard";
import { Records, RecordDrawer } from "./pages/records";
import { ResearchDetail, ResearchList } from "./pages/research";
import { ImportPage } from "./pages/import";
import { Quality } from "./pages/quality";
import { Settings } from "./pages/settings";

function Splash() {
  return (
    <div className="splash">
      <Logo />
      <div className="splash-bar">
        <i></i>
      </div>
      <span>Sessiya tekshirilmoqda...</span>
    </div>
  );
}

export default function App() {
  const { user, booting } = useAuth();
  const [page, setPage] = useState<Page>(() => readPageFromHash());
  const [slug, setSlug] = useState<string | null>(null);
  const [drawerId, setDrawerId] = useState<number | null>(null);
  const [recordsQuery, setRecordsQuery] = useState("");
  const [researchCount, setResearchCount] = useState<number | null>(null);
  const [recordReturn, setRecordReturn] = useState<Page>("records");

  useEffect(() => {
    writePageToHash(page);
  }, [page]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    dataApi
      .cards("all")
      .then((data) => {
        if (!cancelled) setResearchCount(data.items.length);
      })
      .catch(() => {
        if (!cancelled) setResearchCount(null);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const openCard = (cardSlug: string) => {
    setSlug(cardSlug);
    setPage("research-detail");
  };

  const openRecord = (id: number) => {
    setRecordReturn(page);
    setDrawerId(id);
  };

  const globalSearch = (query: string) => {
    setRecordsQuery(query);
    setPage("records");
  };

  if (booting) return <Splash />;
  if (!user) return <Auth />;

  return (
    <div className="app-shell">
      <Sidebar page={page} setPage={setPage} researchCount={researchCount} />
      <div className="app-main">
        <Topbar page={page} onSearch={globalSearch} />
        {page === "dashboard" && <Dashboard setPage={setPage} openCard={openCard} />}
        {page === "research" && <ResearchList openCard={openCard} />}
        {page === "research-detail" && slug && (
          <ResearchDetail
            slug={slug}
            back={() => setPage("research")}
            openRecord={openRecord}
          />
        )}
        {page === "research-detail" && !slug && <ResearchList openCard={openCard} />}
        {page === "records" && (
          <Records initialQuery={recordsQuery} openRecord={openRecord} />
        )}
        {page === "import" && <ImportPage setPage={setPage} />}
        {page === "quality" && <Quality />}
        {page === "settings" && <Settings />}
      </div>
      {drawerId !== null && (
        <RecordDrawer
          messageId={drawerId}
          onClose={() => {
            setDrawerId(null);
            if (recordReturn === "research-detail" && !slug) setPage("research");
          }}
          onOpen={(id) => setDrawerId(id)}
        />
      )}
    </div>
  );
}
