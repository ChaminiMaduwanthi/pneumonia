"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { API_BASE_URL } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type ScanRow = {
  id: number;
  created_at: string;
  disease: string;
  disease_confidence: number;
};

export default function HistoryPage() {
  const { data } = useSession();
  const [items, setItems] = useState<ScanRow[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [diseaseFilter, setDiseaseFilter] = useState("");

  const exportCsv = async () => {
    if (!data?.accessToken) return;
    const response = await fetch(`${API_BASE_URL}/scans/export.php`, {
      headers: { Authorization: `Bearer ${data.accessToken}` },
    });
    if (!response.ok) return;
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "scans_export.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  useEffect(() => {
    const load = async () => {
      if (!data?.accessToken) return;
      const response = await fetch(`${API_BASE_URL}/scans/list.php?page=1&limit=100`, {
        headers: { Authorization: `Bearer ${data.accessToken}` },
      });
      const payload = await response.json();
      setItems(payload.data ?? []);
    };
    void load();
  }, [data?.accessToken]);

  const filtered = useMemo(
    () =>
      items.filter((item) => {
        const text = `${item.disease} ${item.created_at}`.toLowerCase();
        const matchesSearch = text.includes(search.toLowerCase());
        const matchesDisease = diseaseFilter ? item.disease === diseaseFilter : true;
        return matchesSearch && matchesDisease;
      }),
    [items, search, diseaseFilter]
  );

  const paginated = filtered.slice((page - 1) * 10, page * 10);
  const totalPages = Math.max(1, Math.ceil(filtered.length / 10));

  return (
    <div className="container-wrap py-8">
      <Card>
        <CardHeader>
          <CardTitle>Scan History</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <Input placeholder="Search by date or disease" value={search} onChange={(e) => setSearch(e.target.value)} />
            <select className="h-10 rounded-md border border-border px-2" onChange={(e) => setDiseaseFilter(e.target.value)}>
              <option value="">Disease Type</option>
              <option>Viral Pneumonia</option>
              <option>Bacterial Pneumonia</option>
              <option>Normal</option>
            </select>
            <Button variant="outline" onClick={exportCsv}>
              Export CSV
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="py-2">Date</th>
                  <th>Thumbnail</th>
                  <th>Disease</th>
                  <th>Confidence %</th>
                  <th>View</th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td className="py-5 text-center text-foreground/60" colSpan={5}>
                      No scans found.
                    </td>
                  </tr>
                ) : (
                  paginated.map((row) => (
                    <tr key={row.id} className="border-b border-border">
                      <td className="py-3">{new Date(row.created_at).toLocaleDateString()}</td>
                      <td>Image</td>
                      <td>{row.disease}</td>
                      <td>{row.disease_confidence?.toFixed(1) ?? 0}</td>
                      <td>
                        <Link className="text-accent hover:underline" href={`/history/${row.id}`}>
                          View
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between">
            <Button variant="outline" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>
              Previous
            </Button>
            <span className="text-sm">
              Page {page} of {totalPages}
            </span>
            <Button variant="outline" disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)}>
              Next
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
