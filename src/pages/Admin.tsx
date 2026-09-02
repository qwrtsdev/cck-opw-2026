// Admin.tsx

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { sessionManager } from "@/lib/sessionManager";
import toast, { Toaster } from 'react-hot-toast';

import type { Session } from "@/types/game"

import { Loader2 } from "lucide-react";
import ccklogo from "@/assets/cck-logo.png"

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD;

function formatDateTime(iso?: string) {
    if (!iso) return "ไม่มีข้อมูล";

    return new Date(iso).toLocaleString(
        undefined,
        { dateStyle: "medium", timeStyle: "medium", }
    );
}

function Admin() {
    const [authed, setAuthed] = useState(() => sessionStorage.getItem("admin-authed") === "true");
    const [sessions, setSessions] = useState<Session[]>([]);
    const [endedSessions, setEndedSessions] = useState<Session[]>([]);
    const [passwordInput, setPasswordInput] = useState("");
    const [loading, setLoading] = useState(true);
    const [endedLoading, setEndedLoading] = useState(true);
    const [endingId, setEndingId] = useState<string | null>(null);

    function handleLogin(e: React.FormEvent) {
        e.preventDefault();

        if (passwordInput === ADMIN_PASSWORD) {
            sessionStorage.setItem("admin-authed", "true");
            setAuthed(true);
            toast.success('เข้าสู่ระบบสำเร็จ', { duration: 3000, });
        } else { toast.error('รหัสไม่ถูกต้อง กรุณาลองอีกครั้ง', { duration: 3000, }); }

        setPasswordInput("");
    }

    // load active sessions
    useEffect(() => {
        if (!authed) return;

        let cancelled = false;

        async function loadSessions() {
            const { data, error } = await supabase
                .from("sessions")
                .select("id, status, player_id, created_at, profiles(display_name)")
                .in("status", ["waiting", "playing"])
                .order("created_at", { ascending: false });

            if (cancelled) return;

            if (error) {
                setLoading(false);
                return;
            }

            setSessions((data ?? []) as unknown as Session[]);
            setLoading(false);
        }

        loadSessions();
        return () => { cancelled = true; };
    }, [authed]);

    // load ended sessions — no longer gated behind a view toggle, fetch on mount like active
    useEffect(() => {
        if (!authed) return;

        let cancelled = false;

        async function loadEndedSessions() {
            setEndedLoading(true);

            const { data, error } = await supabase
                .from("sessions")
                .select("id, status, player_id, created_at, profiles(display_name)")
                .eq("status", "ended")
                .order("created_at", { ascending: false })
                .limit(20);

            if (cancelled) return;

            if (error) {
                setEndedLoading(false);
                return;
            }

            setEndedSessions((data ?? []) as unknown as Session[]);
            setEndedLoading(false);
        }

        loadEndedSessions();
        return () => { cancelled = true; };
    }, [authed]);

    // realtime listener
    useEffect(() => {
        if (!authed) return;

        const channel = supabase
            .channel("admin-sessions")
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "sessions"
                },
                async (payload) => {
                    if (payload.eventType === "DELETE") {
                        setSessions((prev) => prev.filter((s) => s.id !== payload.old.id));
                        return;
                    }

                    const row = payload.new as {
                        id: string;
                        status: string;
                        player_id: string | null;
                        created_at: string;
                    };

                    const { data: resolved, error: resolvedError } = await supabase
                        .from("sessions")
                        .select("id, status, player_id, created_at, profiles(display_name)")
                        .eq("id", row.id)
                        .maybeSingle();

                    if (resolvedError) {
                        console.error("admin realtime resolve session failed", resolvedError);
                    }

                    const resolvedProfile = Array.isArray((resolved as any)?.profiles)
                        ? (resolved as any).profiles[0] ?? null
                        : (resolved as any)?.profiles ?? null;

                    const updated: Session = resolved
                        ? {
                            id: (resolved as any).id,
                            status: (resolved as any).status,
                            player_id: (resolved as any).player_id ?? undefined,
                            created_at: (resolved as any).created_at,
                            profiles: resolvedProfile && resolvedProfile.display_name
                                ? { display_name: resolvedProfile.display_name }
                                : null,
                        }
                        : {
                            id: row.id,
                            status: row.status,
                            player_id: row.player_id ?? undefined,
                            created_at: row.created_at,
                            profiles: null,
                        };

                    if (row.status !== "waiting" && row.status !== "playing") {
                        setSessions((prev) => prev.filter((s) => s.id !== row.id));
                        if (updated.status === "ended") {
                            setEndedSessions((prev) => {
                                const exists = prev.some((s) => s.id === updated.id);
                                if (exists) return prev.map((s) => (s.id === updated.id ? updated : s));
                                return [updated, ...prev].slice(0, 20);
                            });
                        }
                        return;
                    }

                    setSessions((prev) => {
                        const exists = prev.some((s) => s.id === updated.id);
                        if (exists) { return prev.map((s) => (s.id === updated.id ? updated : s)); }
                        return [updated, ...prev];
                    });
                }
            )
            .subscribe();

        return () => {
            void supabase.removeChannel(channel);
        };
    }, [authed]);

    async function handleEnd(id: string) {
        if (endingId) return;

        setEndingId(id);

        const { error } = await supabase
            .from("sessions")
            .update({ status: "ended" })
            .eq("id", id);

        setEndingId(null);

        if (error) {
            toast.error("ปิดเซสชั่นไม่สำเร็จ");
            return;
        }

        setSessions((prev) => prev.filter((s) => s.id !== id));
    }

    const [creatingSession, setCreatingSession] = useState(false);

    async function handleNewSession() {
        if (creatingSession) return;
        setCreatingSession(true);

        try {
            const data = await sessionManager();
            if (data) {
                toast.success("สร้างเซสชั่นใหม่สำเร็จ");
            }
        } catch {
            toast.error("สร้างเซสชั่นไม่สำเร็จ");
        } finally {
            setCreatingSession(false);
        }
    }

    // authentication
    if (!authed) {
        return (
            <div className="font-thai bg-neutral-900 min-h-screen w-screen flex items-center justify-center text-white">
                <form
                    onSubmit={handleLogin}
                    className="flex flex-col gap-4 items-center bg-neutral-800 p-8 rounded-xl w-80"
                >
                    <img src={ccklogo} alt="Computer Club Logo" className="w-8" />
                    <p className="text-lg font-semibold">เมนูสำหรับแอดมิน</p>
                    <input
                        type="password"
                        autoFocus
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        placeholder="กรอกรหัสผ่าน"
                        className="w-full bg-neutral-700 text-white px-3 py-2 rounded-lg outline-none"
                    />
                    <button
                        type="submit"
                        className="w-full bg-neutral-950 hover:bg-neutral-900 text-white py-2 rounded-lg font-semibold transition"
                    >
                        เข้าสู่ระบบ
                    </button>
                </form>
                <Toaster />
            </div>
        );
    }

    // sessions table
    return (
        <div className="font-thai min-h-screen bg-neutral-900 p-8 text-white">
            <Toaster />
            <div className="mx-auto justify-center max-w-5xl flex flex-col gap-10">
                <div className="flex items-center justify-between">
                    <span className="flex flex-row justify-center items-center">
                        <img src={ccklogo} alt="Computer Club Logo" className="w-6 h-6 mr-2" />
                        <h1 className="font-thai text-2xl font-semibold tracking-tight">เซสชั่นทั้งหมด</h1>
                    </span>
                    <button
                        onClick={handleNewSession}
                        disabled={loading || creatingSession}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-700 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-neutral-600 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        {creatingSession ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : null}
                        สร้างเซสชั่นใหม่
                    </button>
                </div>

                {/* Active sessions */}
                <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <h2 className="font-thai text-lg font-semibold text-neutral-300">กำลังเปิด</h2>
                        {!loading && sessions.length > 0 && (
                            <span className="text-sm text-neutral-500 font-thai">{sessions.length} ที่เปิดอยู่</span>
                        )}
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-16">
                            <Loader2 className="h-6 w-6 animate-spin text-neutral-500" />
                        </div>
                    ) : sessions.length === 0 ? (
                        <div className="rounded-xl border border-neutral-800 py-16 text-center">
                            <p className="text-neutral-500">ไม่มีเซสชั่นที่กำลังเล่นในขณะนี้</p>
                        </div>
                    ) : (
                        <div className="overflow-hidden rounded-xl border border-neutral-800 overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-neutral-800 bg-neutral-800/40 text-xs uppercase tracking-wide text-neutral-500">
                                        <th className="px-4 py-3 font-medium">Session ID</th>
                                        <th className="px-4 py-3 font-medium">Status</th>
                                        <th className="px-4 py-3 font-medium">Player</th>
                                        <th className="px-4 py-3 font-medium">Created</th>
                                        <th className="px-4 py-3 font-medium text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-800 font-thai">
                                    {sessions.map((session) => (
                                        <tr key={session.id} className="text-sm transition-colors hover:bg-neutral-800/30">
                                            <td className="px-4 py-3 font-mono text-xs text-neutral-500">
                                                {session.id.slice(0, 8)}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span
                                                    className={
                                                        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium " +
                                                        (session.status === "playing"
                                                            ? "bg-green-500/10 text-green-400"
                                                            : "bg-yellow-500/10 text-yellow-400")
                                                    }
                                                >
                                                    <span
                                                        className={
                                                            "h-1.5 w-1.5 rounded-full " +
                                                            (session.status === "playing" ? "bg-green-400" : "bg-yellow-400")
                                                        }
                                                    />
                                                    {session.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                {session.profiles?.display_name ?? (
                                                    <span className="text-neutral-600">ไม่มีผู้เล่น</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-neutral-500">
                                                {formatDateTime(session?.created_at)}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <button
                                                    onClick={() => handleEnd(session.id)}
                                                    disabled={endingId === session.id}
                                                    className="rounded-lg bg-red-600/10 px-3 py-1.5 text-xs font-medium text-red-400 transition hover:bg-red-600/20 disabled:opacity-50"
                                                >
                                                    {endingId === session.id ? "กำลังปิด" : "ปิด"}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    <p className="font-thai text-center text-xs text-neutral-400">
                        คำเตือน : มันควรมีแค่ session เดียวที่เปิดอยู่ ถ้ามากกว่านั้นแปลว่ามีปัญหาแล้ว!
                    </p>
                </div>

                {/* Ended sessions */}
                <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <h2 className="font-thai text-lg font-semibold text-neutral-300">จบแล้ว</h2>
                        {!endedLoading && endedSessions.length > 0 && (
                            <span className="text-sm text-neutral-500 font-thai">{endedSessions.length} ที่จบแล้ว</span>
                        )}
                    </div>

                    {endedLoading ? (
                        <div className="flex items-center justify-center py-16">
                            <Loader2 className="h-6 w-6 animate-spin text-neutral-500" />
                        </div>
                    ) : endedSessions.length === 0 ? (
                        <div className="rounded-xl border border-neutral-800 py-16 text-center">
                            <p className="text-neutral-500">ไม่มีเซสชั่นที่จบแล้ว</p>
                        </div>
                    ) : (
                        <div className="overflow-hidden rounded-xl border border-neutral-800 overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-neutral-800 bg-neutral-800/40 text-xs uppercase tracking-wide text-neutral-500">
                                        <th className="px-4 py-3 font-medium">Session ID</th>
                                        <th className="px-4 py-3 font-medium">Status</th>
                                        <th className="px-4 py-3 font-medium">Player</th>
                                        <th className="px-4 py-3 font-medium">Created</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-800 font-thai">
                                    {endedSessions.map((session) => (
                                        <tr key={session.id} className="text-sm transition-colors hover:bg-neutral-800/30">
                                            <td className="px-4 py-3 font-mono text-xs text-neutral-500">
                                                {session.id.slice(0, 8)}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-500/10 px-2.5 py-1 text-xs font-medium text-neutral-400">
                                                    <span className="h-1.5 w-1.5 rounded-full bg-neutral-500" />
                                                    {session.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                {session.profiles?.display_name ?? (
                                                    <span className="text-neutral-600">ไม่มีผู้เล่น</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-neutral-500">
                                                {formatDateTime(session?.created_at)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Admin;