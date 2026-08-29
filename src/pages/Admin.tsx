import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

import type { Session } from "@/types/game"

import { Loader2, Lock } from "lucide-react";

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD;

function formatDateTime(iso: string) {
    return new Date(iso).toLocaleString(
        undefined,
        {
            dateStyle: "medium",
            timeStyle: "medium",
        }
    );
}

function Admin() {
    const [authed, setAuthed] = useState(() => sessionStorage.getItem("admin-authed") === "true");
    const [passwordInput, setPasswordInput] = useState("");
    const [authError, setAuthError] = useState<string | null>(null);

    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    const [endingId, setEndingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    function handleLogin(e: React.FormEvent) {
        e.preventDefault();

        if (passwordInput === ADMIN_PASSWORD) {
            sessionStorage.setItem("admin-authed", "true");
            setAuthed(true);
            setAuthError(null);
        } else {
            setAuthError("Incorrect password.");
        }

        setPasswordInput("");
    }

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
                setError("Failed to load sessions.");
                setLoading(false);
                return;
            }

            setSessions((data ?? []) as unknown as Session[]);
            setLoading(false);
        }

        loadSessions();
        return () => {
            cancelled = true;
        };
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
                        setSessions((prev) =>
                            prev.filter((s) => s.id !== payload.old.id)
                        );
                        return;
                    }

                    const row = payload.new as {
                        id: string;
                        status: string;
                        player_id: string | null;
                        created_at: string;
                    };

                    if (row.status !== "waiting" && row.status !== "playing") {
                        setSessions((prev) => prev.filter((s) => s.id !== row.id));
                        return;
                    }

                    let profile: { display_name: string } | null = null;
                    if (row.player_id) {
                        const { data } = await supabase
                            .from("profiles")
                            .select("display_name")
                            .eq("id", row.player_id)
                            .single();
                        profile = data ?? null;
                    }

                    const updated: Session = {
                        id: row.id,
                        status: row.status,
                        player_id: row.player_id ?? undefined,
                        created_at: row.created_at,
                        profiles: profile,
                    };

                    setSessions((prev) => {
                        const exists = prev.some((s) => s.id === updated.id);
                        if (exists) {
                            return prev.map((s) => (s.id === updated.id ? updated : s));
                        }
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
        setError(null);

        const { error } = await supabase
            .from("sessions")
            .update({ status: "ended" })
            .eq("id", id);

        setEndingId(null);

        if (error) {
            setError("Failed to end session.");
            return;
        }

        setSessions((prev) => prev.filter((s) => s.id !== id));
    }

    // auhentication
    if (!authed) {
        return (
            <div className="bg-neutral-900 min-h-screen w-screen flex items-center justify-center text-white">
                <form
                    onSubmit={handleLogin}
                    className="flex flex-col gap-4 items-center bg-neutral-800 p-8 rounded-xl w-80"
                >
                    <Lock className="w-8 h-8 text-blue-500" />
                    <p className="text-lg font-semibold">Admin Access</p>
                    <input
                        type="password"
                        autoFocus
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        placeholder="Enter password"
                        className="w-full bg-neutral-700 text-white px-3 py-2 rounded-lg outline-none"
                    />
                    {authError && (
                        <p className="text-red-400 text-sm">{authError}</p>
                    )}
                    <button
                        type="submit"
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-lg font-semibold transition"
                    >
                        Enter
                    </button>
                </form>
            </div>
        );
    }

    // sessions table
    return (
        <div className="bg-neutral-900 min-h-screen w-screen p-8 text-white">
            <h1 className="text-2xl font-semibold mb-6">Sessions</h1>

            {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

            {loading ? (
                <div className="flex items-center justify-center p-4">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                </div>
            ) : sessions.length === 0 ? (
                <p className="text-neutral-400">No active sessions.</p>
            ) : (
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-neutral-700 text-neutral-400 text-sm">
                            <th className="py-2 pr-4">Session ID</th>
                            <th className="py-2 pr-4">Status</th>
                            <th className="py-2 pr-4">Player</th>
                            <th className="py-2 pr-4">Created At</th>
                            <th className="py-2 pr-4">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sessions.map((session) => (
                            <tr
                                key={session.id}
                                className="border-b border-neutral-800 text-sm"
                            >
                                <td className="py-2 pr-4 font-mono text-xs text-neutral-400">
                                    {session.id}
                                </td>
                                <td className="py-2 pr-4">
                                    <span
                                        className={
                                            session.status === "playing"
                                                ? "text-green-400"
                                                : "text-yellow-400"
                                        }
                                    >
                                        {session.status}
                                    </span>
                                </td>
                                <td className="py-2 pr-4">
                                    {session.profiles?.display_name ?? (
                                        <span className="text-neutral-500">— unclaimed —</span>
                                    )}
                                </td>
                                <td className="py-2 pr-4 text-neutral-400">
                                    {formatDateTime(session.created_at)}
                                </td>
                                <td className="py-2 pr-4">
                                    <button
                                        onClick={() => handleEnd(session.id)}
                                        disabled={endingId === session.id}
                                        className="bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition"
                                    >
                                        {endingId === session.id ? "Ending..." : "End Session"}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}

export default Admin;