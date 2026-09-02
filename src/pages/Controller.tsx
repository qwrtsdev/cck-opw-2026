// Controller.tsx

import { useEffect, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router";
import toast, { Toaster } from 'react-hot-toast';
import nipplejs from 'nipplejs';
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";

import type { Session, Profile } from "@/types/game";

import gameLogo from "@/assets/cascade_failure_logo.png"
import ccklogo from "@/assets/cck-logo.png"
import { Loader2, Check, CircleAlert, Globe, GamepadDirectional, RefreshCcw } from "lucide-react";

type SessionStatus = "loading" | "invalid" | "ready" | "starting" | "claimed" | "playing";

// Flip to true while testing on the booth floor. Keeps the on-screen
// channel/joystick debug panels — and the render churn behind them — out
// of the default build.
const SHOW_DEBUG_OVERLAY = false;

const STICK_DEADZONE = 3;     // px from center before we treat it as real input
const STICK_SEND_HZ_MS = 33;  // ~30fps throttle for move/face broadcasts

type StickPayload = {
  angle?: number;
  radian?: number;
  vector?: { x: number; y: number };
  distance: number;
  force?: number;
  raw?: unknown;
  direction?: unknown;
};

function toStickPayload(data: any): StickPayload {
  return {
    angle: data.angle?.degree,
    radian: data.angle?.radian,
    vector: data.vector,
    distance: data.distance,
    force: data.force,
    raw: data.raw,
    direction: data.direction,
  };
}

function DebugOverlay({
  channelStatus,
  debugLog,
  joystickData,
  outgoing,
}: {
  channelStatus: string;
  debugLog: Record<string, string>;
  joystickData: { left?: any; right?: any };
  outgoing: any[];
}) {
  return (
    <>
      <div className="absolute top-2 left-2 z-50 bg-black/80 text-green-400 text-[10px] font-mono p-2 rounded max-w-55 space-y-0.5">
        <div>channel: {channelStatus}</div>
        {Object.keys(debugLog).length === 0
          ? <div>no input sent yet</div>
          : Object.entries(debugLog).map(([type, p]) => (
            <div key={type}>{type}: {p}</div>
          ))
        }
      </div>

      <div className="fixed bottom-3 left-1/2 z-50 -translate-x-1/2 bg-black/80 text-white text-[12px] font-mono p-3 rounded-lg w-[95%] max-w-2xl">
        <div className="flex gap-4">
          <div className="flex-1">
            <div className="text-xs text-neutral-300 mb-1">Joystick (raw)</div>
            <pre className="whitespace-pre-wrap text-[11px] text-green-300 max-h-36 overflow-auto">{JSON.stringify(joystickData, null, 2)}</pre>
          </div>
          <div className="w-56">
            <div className="text-xs text-neutral-300 mb-1">Outgoing (latest)</div>
            <div className="text-[11px] max-h-36 overflow-auto space-y-1">
              {outgoing.length === 0 ? (
                <div className="text-neutral-400">no messages</div>
              ) : (
                outgoing.map((m, i) => (
                  <div key={i} className="text-[11px] text-neutral-200 bg-black/30 p-1 rounded">{m.payload?.payload?.type || m.payload?.type || m.event || m.type} — {JSON.stringify(m.payload || m, null, 0)}</div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

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
  // A channel object exists the instant supabase.channel() is called, but
  // isn't actually joined to the topic until .subscribe()'s callback reports
  // 'SUBSCRIBED'. Sending before that can silently drop the broadcast, so we
  // gate sends on this instead of "does a channel object exist".
  const channelReadyRef = useRef(false);
  const [channelStatus, setChannelStatus] = useState<string>("connecting");
  const [debugLog, setDebugLog] = useState<Record<string, string>>({});
  const [joystickData, setJoystickData] = useState<{ left?: any; right?: any }>({});
  const [outgoing, setOutgoing] = useState<any[]>([]);

  const lastSentRef = useRef(0);
  const userRef = useRef(user);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // Throttled broadcast of controller input to the game/display page.
  const sendInput = (type: string, payload: unknown) => {
    const channel = channelRef.current;
    if (!channel || !channelReadyRef.current) return;

    const now = Date.now();
    const isContinuousStick = (type === 'move' || type === 'face') && payload !== null;
    if (isContinuousStick) {
      if (now - lastSentRef.current < STICK_SEND_HZ_MS) return;
      lastSentRef.current = now;
    }

    const message = {
      type: 'broadcast',
      event: 'input',
      payload: { type, payload, playerId: userRef.current.player?.id, ts: now },
    };

    try {
      channel.send(message as any);
    } catch (e) {
      console.error('[realtime] send exception', e);
    }

    if (SHOW_DEBUG_OVERLAY) {
      setDebugLog(prev => ({ ...prev, [type]: JSON.stringify(payload) }));
      setOutgoing(prev => [message, ...prev].slice(0, 20));
    }
  };

  // Realtime: session status changes (claimed by someone else / ended) +
  // this channel is also reused by sendInput() to broadcast controller input.
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
      .subscribe((subStatus) => {
        setChannelStatus(subStatus);
        channelReadyRef.current = subStatus === 'SUBSCRIBED';
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
      channelReadyRef.current = false;
    };
  }, [session?.id, user.player?.id, navigate]);

  // Load the session row.
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
  }, [id, navigate]);

  // Load the player's profile once we have a session and an authed user.
  useEffect(() => {
    if (!session) return;
    if (user.loading) return;
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
      setStatus(
        session?.status === 'playing'
          ? (session.player_id === user.player?.id ? 'playing' : 'claimed')
          : 'ready'
      );
    }

    loadProfile();
    return () => { cancelled = true; };
  }, [session, user.player?.id, user.loading]);

  // Twin joysticks — only mounted once we're actually in the playing view.
  useEffect(() => {
    if (status !== "playing") return;

    const leftZone = document.getElementById('stick-left');
    const rightZone = document.getElementById('stick-right');
    if (!leftZone || !rightZone) return;

    let left: any;
    let right: any;
    let destroyed = false;

    // Tracks whether a finger is actively on either stick right now. On
    // mobile, touching the screen often hides the browser chrome (address
    // bar), which resizes the viewport, which — because the zones are sized
    // with vh via clamp() — fires the ResizeObserver below. Without this
    // guard that would destroy+recreate the stick mid-drag and drop the
    // touch (you'd see 'end' fire but never any 'move').
    const touchActive = { left: false, right: false };

    function destroySticks() {
      left?.destroy();
      right?.destroy();
      left = undefined;
      right = undefined;
    }

    // Wires one nipplejs manager: sends `sendType` on move (once past the
    // deadzone), and resets to `restPayload` on release. `onMove`/`onEnd`
    // are optional extra side-effects (the right stick uses these to also
    // start/stop firing).
    function attachStick(
      manager: any,
      side: 'left' | 'right',
      sendType: string,
      restPayload: unknown,
      onMove?: (payload: StickPayload) => void,
      onEnd?: () => void,
    ) {
      manager.on('start', () => {
        touchActive[side] = true;
        if (SHOW_DEBUG_OVERLAY) setJoystickData(p => ({ ...p, [side]: { active: true } }));
      });

      manager.on('move', (evt: any) => {
        const data = evt.data;
        if (SHOW_DEBUG_OVERLAY) {
          setJoystickData(p => ({
            ...p,
            [side]: data ? { distance: data.distance, angle: data.angle?.degree, vector: data.vector } : undefined,
          }));
        }
        if (!data || data.distance < STICK_DEADZONE) return;

        const payload = toStickPayload(data);
        sendInput(sendType, payload);
        onMove?.(payload);
      });

      manager.on('end', () => {
        touchActive[side] = false;
        if (SHOW_DEBUG_OVERLAY) setJoystickData(p => ({ ...p, [side]: undefined }));
        sendInput(sendType, restPayload);
        onEnd?.();
      });
    }

    function createSticks() {
      if (destroyed || !leftZone || !rightZone) return;
      destroySticks();

      const leftRect = leftZone.getBoundingClientRect();
      const rightRect = rightZone.getBoundingClientRect();
      if (leftRect.width === 0 || leftRect.height === 0 || rightRect.width === 0 || rightRect.height === 0) {
        return;
      }

      left = nipplejs.create({
        zone: leftZone,
        mode: 'static',
        position: { left: '50%', top: '50%' },
        size: Math.min(leftRect.width, 140),
        color: '#a3a3a3',
      });
      right = nipplejs.create({
        zone: rightZone,
        mode: 'static',
        position: { left: '50%', top: '50%' },
        size: Math.min(rightRect.width, 140),
        color: '#a3a3a3',
      });

      // Left stick: movement.
      attachStick(left, 'left', 'move', null);

      // Right stick: aim direction, and auto-fire while held.
      attachStick(right, 'right', 'face', null,
        () => sendInput('fire', true),
        () => sendInput('fire', false));
    }

    createSticks();

    // Recreate whenever either zone's rendered size actually changes
    // (covers: initial mount while hidden, orientation change, resize) —
    // but never while a finger is actively on a stick.
    const ro = new ResizeObserver((entries) => {
      if (touchActive.left || touchActive.right) return;

      const hasSize = entries.every(e => e.contentRect.width > 0 && e.contentRect.height > 0);
      if (hasSize) {
        createSticks();
      } else {
        destroySticks();
      }
    });
    ro.observe(leftZone);
    ro.observe(rightZone);

    return () => {
      destroyed = true;
      ro.disconnect();
      destroySticks();
    };
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

  if (status === "playing") {
    return (
      <div className="w-screen h-dvh bg-neutral-900 select-none relative" style={{ touchAction: 'none' }}>
        <div className="hidden portrait:flex absolute inset-0 z-50 flex-col items-center justify-center gap-4 bg-neutral-900">
          <RefreshCcw className="w-10 h-10 text-neutral-500 animate-[spin_linear_infinite_reverse]" style={{ animationDuration: '2.5s' }} />
          <p className="font-thai text-white text-lg tracking-wide">กรุณาหมุนมือถือแนวนอน</p>
        </div>
        <div className="hidden landscape:flex h-full w-full">
          <div className="w-1/2 h-full flex items-center justify-center">
            <div
              id="stick-left"
              className="relative rounded-full bg-neutral-800 border border-neutral-700"
              style={{ touchAction: 'none', width: 'clamp(88px, min(28vw, 45vh), 220px)', height: 'clamp(88px, min(28vw, 45vh), 220px)' }}
            />
          </div>
          <div className="w-1/2 h-full flex items-center justify-center">
            <div
              id="stick-right"
              className="relative rounded-full bg-neutral-800 border border-neutral-700"
              style={{ touchAction: 'none', width: 'clamp(88px, min(28vw, 45vh), 220px)', height: 'clamp(88px, min(28vw, 45vh), 220px)' }}
            />
          </div>
        </div>

        {SHOW_DEBUG_OVERLAY && (
          <DebugOverlay
            channelStatus={channelStatus}
            debugLog={debugLog}
            joystickData={joystickData}
            outgoing={outgoing}
          />
        )}
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
      <span className="flex flex-row justify-center items-center mt-9">
        <img src={gameLogo} alt="Cascade Failure Logo" className="w-80 h-auto mr-2" />
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

      <span className="flex flex-row justify-center items-center mb-9">
        <img src={ccklogo} alt="Computer Club Logo" className="w-5 h-5 mr-2" />
        <h1 className="font-pixel text-4xl text-white tracking-tight">ชมรมคอมพิวเตอร์ มจพ.</h1>
      </span>

      <Toaster />
    </div>
  );
}

export default Controller;