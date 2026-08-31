import { useEffect, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router";
import toast, { Toaster } from 'react-hot-toast';
import nipplejs from 'nipplejs';
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";

import type { Session, SessionStatus, Profile } from "@/types/game";

import ccklogo from "@/assets/cck-logo.png"
import TouchButton from "@/components/TouchButton";
import { Loader2, Check, CircleAlert, Globe, GamepadDirectional } from "lucide-react";

function Controller() {
  const [params] = useSearchParams();
  const id = params.get("id");
  const user = useAuth();
  const navigate = useNavigate();

  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [nameLoading, setNameLoading] = useState(false);

  const [status, setStatus] = useState<SessionStatus>("loading");

  const channelRef = useRef<RealtimeChannel | null>(null);
  const lastSentRef = useRef(0);

  // Realtime: session status changes (claimed by someone else / ended) +
  // this channel is also reused by sendInput() to broadcast controller input
  useEffect(() => {
    if (!session?.id) return;

    const channel = supabase
      .channel(`session-${session.id}`)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'sessions', filter: `id=eq.${session.id}` },
        (payload: { new: Session }) => {
          setSession(payload.new);
          if (payload.new.status === 'ended') {
            navigate(`/result?id=${payload.new.id}`);
            return;
          }
          if (payload.new.status === 'playing' && payload.new.player_id !== user.player?.id) {
            setStatus('claimed');
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [session?.id, user.player?.id]);

  // Load the session row
  useEffect(() => {
    if (!id) {
      setStatus("invalid");
      return;
    }

    let cancelled = false;

    async function loadSession() {
      const { data, error } = await supabase
        .from("sessions")
        .select("id, status, player_id")
        .eq("id", id)
        .single();

      if (cancelled) return;

      if (error || !data) {
        setStatus("invalid");
        return;
      }

      if (data.status === "ended") {
        navigate(`/result?id=${id}`);
        return;
      }

      setSession(data);
    }

    loadSession();
    return () => { cancelled = true; };
  }, [id]);

  // Load the player's profile once we have a session and an authed user
  useEffect(() => {
    // NOTE: if useAuth exposes a loading flag (e.g. user.loading), guard on
    // that here too — otherwise this can briefly mark the session "invalid"
    // while auth is still resolving. Worth checking useAuth's shape.
    if (!session) return;
    if (!user.player?.id) return;

    let cancelled = false;

    async function loadProfile() {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name")
        .eq("id", user.player?.id)
        .single();

      if (cancelled) return;

      if (error || !data) {
        toast.error('เกิดปัญหาขณะโหลดโปรไฟล์', { duration: 3000 });
        setStatus("invalid");
        return;
      }

      setProfile(data);
      setDisplayName(data.display_name);

      if (session?.status === 'playing') {
        setStatus(session?.player_id === user?.player?.id ? 'playing' : 'claimed');
      } else {
        setStatus('ready');
      }
    }

    loadProfile();
    return () => { cancelled = true; };
  }, [session, user.player?.id]);

  // Twin joysticks — only mounted once we're actually in the playing view
  useEffect(() => {
    if (status !== "playing") return;

    const left = nipplejs.create({
      zone: document.getElementById('stick-left')!,
      mode: 'static',
      position: { left: '50%', top: '50%' },
      size: 140,
      color: '#a3a3a3',
    });
    const right = nipplejs.create({
      zone: document.getElementById('stick-right')!,
      mode: 'static',
      position: { left: '50%', top: '50%' },
      size: 140,
      color: '#a3a3a3',
    });

    const DEADZONE = 10; // px of stick travel before a direction counts — avoids jitter near center

    (left as any).on('move', (_evt: any, data: any) => {
      if (data.distance < DEADZONE) return;
      sendInput('move', angleToDirection(data.angle.degree));
    });
    (left as any).on('end', () => sendInput('move', null));

    (right as any).on('move', (_evt: any, data: any) => {
      if (data.distance < DEADZONE) return;
      sendInput('face', angleToDirection(data.angle.degree));
    });
    (right as any).on('end', () => sendInput('face', null));

    return () => { left.destroy(); right.destroy(); };
  }, [status]);

  async function handleUpdateName() {
    if (!user.player?.id || !displayName.trim() || nameLoading) return;
    setNameLoading(true);

    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName.trim() })
      .eq("id", user.player.id);

    setNameLoading(false);

    if (error) {
      toast.error('เกิดปัญหาขณะบันทึกชื่อ', { duration: 3000 });
      return;
    }

    toast.success('เปลี่ยนชื่อผู้เล่นสำเร็จ', { duration: 3000 });
    if (profile) setProfile({ ...profile, display_name: displayName.trim() });
  }

  async function handleStart() {
    if (!user.player?.id || !id || status === "starting" || status === "playing") return;
    setStatus("starting");

    const { data, error } = await supabase
      .from("sessions")
      .update({ player_id: user.player.id, status: "playing" })
      .eq("id", id)
      .is("player_id", null)
      .neq("status", "ended")
      .select()
      .single();

    if (error || !data) {
      setStatus("claimed");
      return;
    }

    setSession(data);
    setStatus("playing");
  }

  // throttled broadcast of controller input to the game/display page
  function sendInput(type: string, payload: unknown) {
    const channel = channelRef.current;
    if (!channel) return;

    const isStick = type === 'moveLeft' || type === 'moveRight';
    const now = Date.now();
    if (isStick && payload !== null) {
      if (now - lastSentRef.current < 33) return;
      lastSentRef.current = now;
    }

    channel.send({
      type: 'broadcast',
      event: 'input',
      payload: { type, payload, playerId: user.player?.id, ts: now },
    });
  }

  // bucket a continuous angle into 4 cardinal directions
  function angleToDirection(degree: number): 'up' | 'down' | 'left' | 'right' {
    const normalized = ((degree % 360) + 360) % 360;
    if (normalized >= 45 && normalized < 135) return 'up';
    if (normalized >= 135 && normalized < 225) return 'left';
    if (normalized >= 225 && normalized < 315) return 'down';
    return 'right';
  }

  if (status === "playing") {
    return (
      <div className="w-screen h-dvh bg-neutral-900 select-none relative" style={{ touchAction: 'none' }}>

        <div className="hidden portrait:flex absolute inset-0 z-50 flex-col items-center justify-center gap-4 bg-neutral-900">
          <GamepadDirectional className="w-12 h-12 text-neutral-500 animate-spin" style={{ animationDuration: '2.5s' }} />
          <p className="font-thai text-white text-lg tracking-wide">กรุณาหมุนมือถือ</p>
        </div>

        <div className="hidden landscape:flex h-full w-full items-center justify-center">
          <div className="flex flex-col items-center" style={{ gap: 'clamp(12px, 3vh, 28px)' }}>

            <div className="flex items-center" style={{ gap: 'clamp(16px, 6vw, 48px)' }}>
              <div
                id="stick-left"
                className="relative rounded-full bg-neutral-800 border border-neutral-700"
                style={{ touchAction: 'none', width: 'clamp(88px, 22vh, 150px)', height: 'clamp(88px, 22vh, 150px)' }}
              />
              <div
                id="stick-right"
                className="relative rounded-full bg-neutral-800 border border-neutral-700"
                style={{ touchAction: 'none', width: 'clamp(88px, 22vh, 150px)', height: 'clamp(88px, 22vh, 150px)' }}
              />
            </div>

            <div className="flex items-center" style={{ gap: 'clamp(12px, 3vw, 24px)' }}>
              <TouchButton label="B" onPress={() => sendInput('B', true)} onRelease={() => sendInput('B', false)} />
              <TouchButton label="A" onPress={() => sendInput('A', true)} onRelease={() => sendInput('A', false)} />
            </div>
          </div>
        </div>
      </div>
    )
  }

  const invalidNotice = (
    <div className="rounded-xl border border-neutral-700 py-16 px-6 flex flex-col items-center justify-center gap-6">
      <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium bg-blue-400/10">
        <p className="text-blue-400"><Globe color="#51a2ff" className="inline w-4 h-4" />{" "}{id?.slice(0, 8) || "--"}</p>
      </span>

      <div className="flex flex-col items-center justify-center gap-3">
        <CircleAlert className="text-red-400 w-7 h-7" />
        <p className="text-sm text-neutral-500 font-thai text-center">ไม่สามารถเชื่อมต่อได้ เนื่องจากไม่มีเซสชั่นนี้<br />หรืออาจจะจบไปแล้ว<br />กรุณาลองแสกนใหม่อีกครั้งที่หน้าบูธ</p>
      </div>
    </div>
  );

  const validNotice = (
    <div className="rounded-xl border border-neutral-700 py-16 flex flex-col items-center justify-center gap-3">
      <div className="flex flex-row gap-2 items-center">
        <input
          className="bg-neutral-800 text-white px-3 py-2 rounded-lg outline-none"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="ชื่อภายในเกม"
        />
        <button
          onClick={handleUpdateName}
          disabled={nameLoading || !displayName.trim()}
          className="bg-neutral-700 text-white p-2 rounded-lg hover:bg-neutral-600 transition disabled:opacity-50"
        >
          {nameLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Check className="w-5 h-5" />
          )}
        </button>
      </div>

      <button
        onClick={handleStart}
        disabled={status === "starting" || status === "claimed"}
        className={`px-6 py-3 rounded-xl font-semibold transition disabled:opacity-50 text-white ${status === "claimed" ? "bg-red-600 hover:bg-red-500" : "bg-neutral-600 hover:bg-neutral-500"
          }`}
      >
        {status === "starting" ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : status === "claimed" ? (
          "มีผู้กำลังเล่นอยู่แล้ว"
        ) : (
          "เริ่มเกม"
        )}
      </button>
    </div>
  )

  return (
    <div className="min-h-screen w-screen bg-neutral-900 select-none relative flex flex-col gap-9 justify-center items-center">
      <span className="flex flex-row justify-center items-center">
        <img src={ccklogo} alt="Computer Club Logo" className="w-7 h-7 mr-2" />
        <h1 className="font-pixel text-6xl text-white tracking-tight">ชมรมคอมพิวเตอร์ มจพ.</h1>
      </span>

      {status === "loading" ? (
        <div className="min-h-screen w-screen bg-neutral-900 select-none relative flex justify-center items-center">
          <Loader2 className="w-8 h-8 animate-spin text-neutral-500" />
        </div>
      ) : (
        <div className="font-thai mx-auto max-w-md w-full px-4">
          {status === "invalid" ? invalidNotice : validNotice}
        </div>
      )}

      <div className="font-thai mx-auto max-w-md w-full px-4">
        <div className="rounded-xl border border-neutral-700 p-6 flex flex-col gap-4">
          <span className="flex flex-row gap-2">
            <GamepadDirectional color="#ffffff" className="inline" />
            <p className="text-white text-lg font-semibold">วิธีการเล่น</p>
          </span>

          <ol className="flex flex-col gap-3">
            <li className="flex items-start gap-3">
              <span className="shrink-0 h-5 w-5 rounded-full bg-neutral-800 text-neutral-400 text-xs font-medium flex items-center justify-center mt-0.5">
                1
              </span>
              <p className="text-sm text-neutral-300 leading-relaxed">
                สแกน QR Code เพื่อเข้าร่วมเกมเพื่อเชื่อมต่อเซสชั่น
              </p>
            </li>

            <li className="flex items-start gap-3">
              <span className="shrink-0 h-5 w-5 rounded-full bg-neutral-800 text-neutral-400 text-xs font-medium flex items-center justify-center mt-0.5">
                2
              </span>
              <p className="text-sm text-neutral-300 leading-relaxed">
                ตั้งชื่อภายในเกมตามที่ต้องการแสดงผลใน Leaderboard
              </p>
            </li>

            <li className="flex items-start gap-3">
              <span className="shrink-0 h-5 w-5 rounded-full bg-neutral-800 text-neutral-400 text-xs font-medium flex items-center justify-center mt-0.5">
                3
              </span>
              <p className="text-sm text-neutral-300 leading-relaxed">
                กดปุ่ม "เริ่มต้นเกม" เพื่อเริ่มเกม
              </p>
            </li>

            <li className="flex items-start gap-3">
              <span className="shrink-0 h-5 w-5 rounded-full bg-neutral-800 text-neutral-400 text-xs font-medium flex items-center justify-center mt-0.5">
                4
              </span>
              <p className="text-sm text-neutral-300 leading-relaxed">
                ใช้โทรศัพท์ของคุณเป็นตัวควบคุมผ่านปุ่มควบคุมบนหน้าจอ
              </p>
            </li>
          </ol>
        </div>
      </div>

      <Toaster />
    </div>
  );
}

export default Controller;