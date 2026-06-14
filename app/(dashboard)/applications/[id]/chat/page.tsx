"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { routes } from "@/lib/api-routes";
import { ApiError } from "@/lib/api-base";
import { RoleGuard } from "@/components/role-guard";
import { useSession } from "@/components/providers/session-provider";
import { createChatSocket } from "@/lib/chat-socket";
import type { Message } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageContainer } from "@/components/layout/page";
import { ChatSkeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";

const CHAT_BODY_MIN = 1;
const CHAT_BODY_MAX = 8000;

function mergeMessage(prev: Message[], msg: Message): Message[] {
  if (prev.some((m) => m.id === msg.id)) return prev;
  return [...prev, msg];
}

function parseIncomingMessage(raw: unknown): Message | null {
  if (!raw || typeof raw !== "object") return null;
  const m = raw as Partial<Message>;
  if (typeof m.id !== "string" || typeof m.body !== "string") return null;
  const createdAt =
    typeof m.createdAt === "string"
      ? m.createdAt
      : new Date().toISOString();
  return { ...m, createdAt } as Message;
}

type JoinAck = { ok?: boolean; error?: string };
type SendAck = { error?: string } & Partial<Message>;

export default function ApplicationChatPage() {
  const params = useParams();
  const applicationId = params.id as string;
  const { api, accessToken, user } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [roomReady, setRoomReady] = useState(false);
  const roomReadyRef = useRef(false);
  const [socketHint, setSocketHint] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<ReturnType<typeof createChatSocket> | null>(null);

  useEffect(() => {
    roomReadyRef.current = roomReady;
  }, [roomReady]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const list = await api.get<Message[]>(
          routes.chat.messages(applicationId),
        );
        if (!cancelled) setMessages(list);
      } catch (e) {
        if (!cancelled)
          setError(e instanceof ApiError ? e.message : "Ошибка загрузки чата");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [api, applicationId]);

  useEffect(() => {
    if (!accessToken) return;
    const socket = createChatSocket(accessToken);
    socketRef.current = socket;

    const onIncoming = (raw: unknown) => {
      const msg = parseIncomingMessage(raw);
      if (!msg) return;
      setMessages((prev) => mergeMessage(prev, msg));
    };

    function emitJoin() {
      roomReadyRef.current = false;
      setRoomReady(false);
      setSocketHint("Подключение к комнате…");
      socket.emit("join", applicationId, (ack?: JoinAck) => {
        if (ack?.error === "forbidden") {
          setSocketHint(null);
          roomReadyRef.current = false;
          setError("Нет доступа к этому чату");
          setRoomReady(false);
          return;
        }
        if (!ack?.ok) {
          setSocketHint("Не удалось подключиться к комнате");
          roomReadyRef.current = false;
          setRoomReady(false);
          return;
        }
        setSocketHint(null);
        roomReadyRef.current = true;
        setRoomReady(true);
      });
    }

    const onDisconnect = (reason: string) => {
      roomReadyRef.current = false;
      setRoomReady(false);
      if (reason === "io server disconnect") {
        setSocketHint("Сервер разорвал соединение");
      }
    };
    const onConnectError = (err: Error) => {
      roomReadyRef.current = false;
      setSocketHint(`Нет связи с чатом: ${err.message}`);
      setRoomReady(false);
    };

    socket.on("connect", emitJoin);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);
    socket.on("message", onIncoming);

    if (socket.connected) emitJoin();

    return () => {
      socket.off("connect", emitJoin);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
      socket.off("message", onIncoming);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [accessToken, applicationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendViaHttp(text: string) {
    const msg = await api.post<Message>(routes.chat.messages(applicationId), {
      body: text,
    });
    setBody("");
    setMessages((prev) => mergeMessage(prev, msg));
  }

  function send() {
    const text = body.trim();
    if (text.length < CHAT_BODY_MIN || text.length > CHAT_BODY_MAX) {
      setError(
        `Текст сообщения: от ${CHAT_BODY_MIN} до ${CHAT_BODY_MAX} символов.`,
      );
      return;
    }
    setSending(true);
    setError(null);

    const socket = socketRef.current;
    if (socket?.connected && roomReadyRef.current) {
      socket.emit(
        "send",
        { applicationId, body: text },
        (ack: SendAck | undefined) => {
          setSending(false);
          if (!ack) {
            setError("Сервер не ответил на отправку");
            return;
          }
          if (ack.error === "failed") {
            setError("Не удалось отправить сообщение");
            return;
          }
          if (typeof ack.id === "string" && typeof ack.body === "string") {
            setBody("");
            setMessages((prev) => mergeMessage(prev, ack as Message));
            return;
          }
          setError("Неожиданный ответ сервера");
        },
      );
      return;
    }

    void (async () => {
      try {
        await sendViaHttp(text);
      } catch (e) {
        setError(e instanceof ApiError ? e.message : "Не отправилось");
      } finally {
        setSending(false);
      }
    })();
  }

  const isOwn = (m: Message) => m.sender?.id === user?.id;

  return (
    <RoleGuard allow={["STUDENT", "EMPLOYER"]}>
      <PageContainer narrow>
        <div className="mb-6 flex flex-wrap items-center gap-3 text-sm">
          <Link
            href={
              user?.role === "EMPLOYER"
                ? `/employer/applications/${applicationId}`
                : "/applications"
            }
            className="font-medium text-muted-foreground transition-colors hover:text-accent"
          >
            ← {user?.role === "EMPLOYER" ? "К отклику" : "Мои отклики"}
          </Link>
          {user?.role === "EMPLOYER" ? (
            <>
              <span className="text-border">|</span>
              <Link
                href="/employer/jobs"
                className="font-medium text-muted-foreground transition-colors hover:text-accent"
              >
                Мои вакансии
              </Link>
            </>
          ) : null}
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Чат по отклику
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            История — по HTTP; отправка и push — через Socket.IO namespace{" "}
            <span className="font-mono text-xs">/chat</span>.
          </p>
        </div>

        {socketHint ? (
          <p className="mb-4 rounded-xl border border-border bg-muted/40 px-4 py-2 text-sm text-muted-foreground">
            {socketHint}
          </p>
        ) : null}

        {error ? (
          <p className="mb-4 rounded-xl border border-danger/30 bg-danger/5 px-4 py-2 text-sm text-danger">
            {error}
          </p>
        ) : null}

        <Card
          padding={false}
          className="flex max-h-[min(70vh,640px)] min-h-[380px] flex-col overflow-hidden"
        >
          <div className="border-b border-border/80 bg-muted/40 px-4 py-3 sm:px-5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Переписка
              {!roomReady && accessToken ? (
                <span className="ml-2 font-normal text-amber-700">
                  (ожидание сокета…)
                </span>
              ) : null}
            </p>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4 sm:px-5">
            {loading ? (
              <ChatSkeleton />
            ) : messages.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Начните переписку — отправьте первое сообщение.
              </p>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={cn(
                    "max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm",
                    isOwn(m)
                      ? "ml-auto rounded-br-md bg-accent text-accent-foreground"
                      : "mr-auto rounded-bl-md border border-border/80 bg-muted/60 text-foreground",
                  )}
                >
                  <p className="text-[11px] font-medium opacity-80">
                    {m.sender?.email ?? "Участник"}
                  </p>
                  <p className="mt-1.5 whitespace-pre-wrap leading-relaxed">
                    {m.body}
                  </p>
                  <p className="mt-2 text-[10px] opacity-70">
                    {new Date(m.createdAt).toLocaleString()}
                  </p>
                </div>
              ))
            )}
            <div ref={bottomRef} />
          </div>
          <div className="border-t border-border/80 bg-muted/30 p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <textarea
                className="min-h-[88px] flex-1 resize-y rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm shadow-sm outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground focus-visible:border-accent/60 focus-visible:ring-2 focus-visible:ring-ring/25"
                placeholder="Напишите сообщение…"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                maxLength={CHAT_BODY_MAX}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send();
                  }
                }}
              />
              <Button
                type="button"
                className="shrink-0 sm:min-w-[120px]"
                disabled={
                  sending ||
                  body.trim().length < CHAT_BODY_MIN ||
                  body.trim().length > CHAT_BODY_MAX
                }
                onClick={() => void send()}
              >
                {sending
                  ? "Отправка…"
                  : roomReady
                    ? "Отправить"
                    : "Отправить (HTTP)"}
              </Button>
            </div>
            {!roomReady && accessToken ? (
              <p className="mt-3 text-xs text-muted-foreground">
                Пока комната не подключена, отправка идёт через REST (другой
                участник может не увидеть сообщение в реальном времени).
              </p>
            ) : null}
          </div>
        </Card>
      </PageContainer>
    </RoleGuard>
  );
}
