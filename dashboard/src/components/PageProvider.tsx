"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "@/lib/api";

interface Page {
  id: string;
  fbPageId: string;
  name: string;
  isActive: boolean;
}

interface PageContextValue {
  pages: Page[];
  pageId: string | null;
  setPageId: (id: string) => void;
}

const PageContext = createContext<PageContextValue>({ pages: [], pageId: null, setPageId: () => {} });

export function PageProvider({ children }: { children: ReactNode }) {
  const [pages, setPages] = useState<Page[]>([]);
  const [pageId, setPageIdState] = useState<string | null>(null);

  useEffect(() => {
    api<Page[]>("/api/pages")
      .then((rows) => {
        setPages(rows);
        const saved = localStorage.getItem("activePageId");
        const active = rows.find((p) => p.id === saved) ?? rows[0];
        if (active) setPageIdState(active.id);
      })
      .catch(() => {});
  }, []);

  const setPageId = (id: string) => {
    setPageIdState(id);
    localStorage.setItem("activePageId", id);
  };

  return <PageContext.Provider value={{ pages, pageId, setPageId }}>{children}</PageContext.Provider>;
}

export function usePage() {
  return useContext(PageContext);
}
