"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck, FileSignature, CreditCard, CheckCircle2, AlertTriangle,
  Loader2, Eraser, PartyPopper, Lock,
} from "lucide-react";
import {
  saveMyPrecheckin, payMyBalance, payMyDeposit,
} from "@/app/account/(portal)/actions";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import type { AgreementSection, DocumentStatus } from "@/lib/types/database";

export function PrecheckinFlow({
  reservationId,
  reservationNumber,
  vehicleName,
  pickupAt,
  customerName,
  dlStatus,
  insuranceStatus,
  insuranceRequired,
  balanceDue,
  depositAmount,
  depositAuthorized,
  agreementName,
  agreementSections,
  completedAt,
}: {
  reservationId: string;
  reservationNumber: string;
  vehicleName: string;
  pickupAt: string;
  customerName: string;
  dlStatus: DocumentStatus;
  insuranceStatus: DocumentStatus;
  insuranceRequired: boolean;
  balanceDue: number;
  depositAmount: number;
  depositAuthorized: boolean;
  agreementName: string;
  agreementSections: AgreementSection[];
  completedAt: string | null;
}) {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [pending, startTransition] = useTransition();
  const [payPending, startPay] = useTransition();
  const [depositPending, startDeposit] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(Boolean(completedAt));

  const dlOk = dlStatus === "verified";
  const insOk = !insuranceRequired || insuranceStatus === "verified";
  const docsReady = dlOk && insOk;

  // Initialise the signature pad with a white background.
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, c.width, c.height);
    }
  }, [done]);

  function pointFor(e: React.PointerEvent<HTMLCanvasElement>) {
    const c = canvasRef.current!;
    const rect = c.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * c.width,
      y: ((e.clientY - rect.top) / rect.height) * c.height,
    };
  }
  function startStroke(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault();
    const c = canvasRef.current!;
    const ctx = c.getContext("2d")!;
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const p = pointFor(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    drawing.current = true;
    c.setPointerCapture(e.pointerId);
  }
  function moveStroke(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    e.preventDefault();
    const ctx = canvasRef.current!.getContext("2d")!;
    const p = pointFor(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    if (!hasSignature) setHasSignature(true);
  }
  function endStroke() {
    drawing.current = false;
  }
  function clearSignature() {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, c.width, c.height);
    setHasSignature(false);
  }

  function pay() {
    setError(null);
    startPay(async () => {
      const res = await payMyBalance(reservationId);
      if (res.ok && res.data?.url) {
        window.location.href = String(res.data.url);
      } else {
        setError(res.error ?? "Could not start payment.");
      }
    });
  }

  function authorizeDeposit() {
    setError(null);
    startDeposit(async () => {
      const res = await payMyDeposit(reservationId);
      if (res.ok && res.data?.url) {
        window.location.href = String(res.data.url);
      } else {
        setError(res.error ?? "Could not start the deposit authorization.");
      }
    });
  }

  function complete() {
    if (!agreed) {
      setError("Please confirm you agree to the rental agreement.");
      return;
    }
    if (!hasSignature || !canvasRef.current) {
      setError("Please add your signature in the box.");
      return;
    }
    setError(null);
    const dataUrl = canvasRef.current.toDataURL("image/png");
    startTransition(async () => {
      const res = await saveMyPrecheckin(reservationId, dataUrl);
      if (res.ok) {
        setDone(true);
        router.refresh();
      } else {
        setError(res.error ?? "Could not complete pre-check-in.");
      }
    });
  }

  // ---- Completed state -----------------------------------------------------
  if (done) {
    return (
      <div className="glass mt-6 rounded-2xl p-6 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
          <PartyPopper className="h-7 w-7" />
        </span>
        <h2 className="heading-display mt-4 text-xl font-bold text-white">
          Pre-Check-In Complete
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          Thanks, {customerName}. You&apos;re all set — your pickup of{" "}
          {vehicleName} on {formatDateTime(pickupAt)} will be quick and easy.
        </p>
        {!docsReady && (
          <p className="mx-auto mt-3 max-w-md rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
            Our team is still reviewing your documents — we&apos;ll let you know
            once they&apos;re verified.
          </p>
        )}
        <Link
          href={`/account/reservations/${reservationId}`}
          className="mt-5 inline-flex items-center gap-2 rounded-lg border border-white/15 px-5 py-2.5 text-sm font-medium text-slate-200 transition-colors hover:bg-white/10"
        >
          Back to Reservation
        </Link>
      </div>
    );
  }

  // ---- Flow ----------------------------------------------------------------
  return (
    <div className="mt-6 space-y-5">
      {/* Step 1 — Documents */}
      <StepCard
        n={1}
        icon={ShieldCheck}
        title="Your Documents"
        done={docsReady}
      >
        {docsReady ? (
          <p className="text-sm text-emerald-300">
            Your driver license{insuranceRequired ? " and insurance are" : " is"}{" "}
            verified.
          </p>
        ) : (
          <div className="space-y-2">
            <DocLine label="Driver license" status={dlStatus} />
            {insuranceRequired && (
              <DocLine label="Proof of insurance" status={insuranceStatus} />
            )}
            <Link
              href="/account/documents"
              className="inline-flex items-center gap-1.5 rounded-lg bg-gold-500 px-3.5 py-2 text-xs font-semibold text-brand-950 transition-colors hover:bg-gold-400"
            >
              Upload &amp; verify my documents
            </Link>
            <p className="text-xs text-slate-500">
              You can still sign below now — your documents can be verified
              separately.
            </p>
          </div>
        )}
      </StepCard>

      {/* Step 2 — Agreement */}
      <StepCard n={2} icon={FileSignature} title="Rental Agreement">
        <p className="text-sm text-slate-400">
          Please review the {agreementName} and sign below.
        </p>
        <div className="mt-3 max-h-64 space-y-3 overflow-y-auto rounded-lg border border-white/10 bg-brand-900 p-4">
          {agreementSections.length > 0 ? (
            agreementSections.map((s, i) => (
              <div key={i}>
                {s.title && (
                  <p className="text-sm font-semibold text-white">{s.title}</p>
                )}
                <p className="mt-0.5 whitespace-pre-line text-xs leading-relaxed text-slate-400">
                  {s.body}
                </p>
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-400">
              By signing below you agree to Car Mart Rentals&apos; standard
              rental terms and conditions, which will be provided in full at
              pickup.
            </p>
          )}
        </div>

        <label className="mt-3 flex items-start gap-2.5">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-white/20 bg-white/5 text-gold-500"
          />
          <span className="text-sm text-slate-300">
            I have read and agree to the {agreementName}.
          </span>
        </label>

        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Your Signature
            </span>
            <button
              type="button"
              onClick={clearSignature}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-white"
            >
              <Eraser className="h-3.5 w-3.5" /> Clear
            </button>
          </div>
          <canvas
            ref={canvasRef}
            width={600}
            height={180}
            onPointerDown={startStroke}
            onPointerMove={moveStroke}
            onPointerUp={endStroke}
            onPointerLeave={endStroke}
            style={{ touchAction: "none" }}
            className="h-44 w-full cursor-crosshair rounded-lg border border-white/15 bg-white"
          />
          <p className="mt-1 text-xs text-slate-500">
            Sign with your finger or mouse.
          </p>
        </div>
      </StepCard>

      {/* Step 3 — Security deposit */}
      {depositAmount > 0 && (
        <StepCard
          n={3}
          icon={Lock}
          title="Security Deposit"
          done={depositAuthorized}
        >
          {depositAuthorized ? (
            <p className="text-sm text-emerald-300">
              Your refundable {formatCurrency(depositAmount)} deposit hold is
              authorized — a hold on your card, not a charge.
            </p>
          ) : (
            <>
              <p className="text-sm text-slate-300">
                A refundable{" "}
                <span className="font-semibold text-white">
                  {formatCurrency(depositAmount)}
                </span>{" "}
                hold will be placed on your card.
              </p>
              <p className="mt-1 text-xs text-slate-500">
                This is an authorization hold — <strong>not a charge</strong>.
                It is released after you return the vehicle, and only applied
                if there is damage or an outstanding fee.
              </p>
              <button
                type="button"
                onClick={authorizeDeposit}
                disabled={depositPending}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3.5 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-white/10 disabled:opacity-50"
              >
                {depositPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Lock className="h-4 w-4" />
                )}
                Authorize {formatCurrency(depositAmount)} Hold
              </button>
            </>
          )}
        </StepCard>
      )}

      {/* Balance */}
      {balanceDue > 0 && (
        <StepCard
          n={depositAmount > 0 ? 4 : 3}
          icon={CreditCard}
          title="Outstanding Balance"
        >
          <p className="text-sm text-slate-300">
            Balance due:{" "}
            <span className="font-semibold text-white">
              {formatCurrency(balanceDue)}
            </span>
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Pay now for the fastest pickup — or you can pay in person at pickup.
          </p>
          <button
            type="button"
            onClick={pay}
            disabled={payPending}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3.5 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-white/10 disabled:opacity-50"
          >
            {payPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CreditCard className="h-4 w-4" />
            )}
            Pay {formatCurrency(balanceDue)} Online
          </button>
        </StepCard>
      )}

      {error && (
        <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={complete}
        disabled={pending || !agreed || !hasSignature}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-gold-500 px-5 py-3.5 text-sm font-semibold text-brand-950 transition-colors hover:bg-white disabled:opacity-40"
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <CheckCircle2 className="h-4 w-4" />
        )}
        Complete Pre-Check-In
      </button>
      <p className="text-center text-xs text-slate-500">
        Reservation {reservationNumber}
      </p>
    </div>
  );
}

function StepCard({
  n,
  icon: Icon,
  title,
  done,
  children,
}: {
  n: number;
  icon: typeof ShieldCheck;
  title: string;
  done?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center gap-2.5">
        <span
          className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
            done
              ? "bg-emerald-500/20 text-emerald-300"
              : "bg-gold-500/15 text-gold-300"
          }`}
        >
          {done ? <CheckCircle2 className="h-4 w-4" /> : n}
        </span>
        <h2 className="flex items-center gap-2 text-base font-semibold text-white">
          <Icon className="h-4 w-4 text-gold-300" /> {title}
        </h2>
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function DocLine({
  label,
  status,
}: {
  label: string;
  status: DocumentStatus;
}) {
  const ok = status === "verified";
  return (
    <p className="flex items-center gap-1.5 text-sm">
      {ok ? (
        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
      ) : (
        <AlertTriangle className="h-4 w-4 text-amber-400" />
      )}
      <span className={ok ? "text-slate-300" : "text-slate-400"}>
        {label} —{" "}
        {ok
          ? "verified"
          : status === "pending"
            ? "pending review"
            : status === "rejected"
              ? "needs attention"
              : "not submitted"}
      </span>
    </p>
  );
}
