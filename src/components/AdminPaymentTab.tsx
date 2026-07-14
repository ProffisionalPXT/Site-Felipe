"use client";

import { FormEvent, useEffect, useState } from "react";
import type { PaymentSettings } from "@/lib/payment-settings";

type Props = {
  password: string;
  onMessage: (msg: string | null, err: string | null) => void;
};

export function AdminPaymentTab({ password, onMessage }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<PaymentSettings | null>(null);

  const [mode, setMode] = useState<"mercadopago" | "manual_pix">("manual_pix");
  const [acceptPix, setAcceptPix] = useState(true);
  const [acceptCard, setAcceptCard] = useState(true);
  const [cardFeePercent, setCardFeePercent] = useState("5");
  const [mpToken, setMpToken] = useState("");
  const [clearToken, setClearToken] = useState(false);
  const [pixKey, setPixKey] = useState("");
  const [pixKeyType, setPixKeyType] = useState<PaymentSettings["pix_key_type"]>("random");
  const [receiverName, setReceiverName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [notes, setNotes] = useState("");
  const [tokenHint, setTokenHint] = useState("");
  const [tokenConfigured, setTokenConfigured] = useState(false);
  const [helpOpen, setHelpOpen] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch("/api/admin/payment", {
      headers: { "x-admin-password": password },
    })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Erro");
        const s = data.settings as PaymentSettings;
        setSettings(s);
        setMode(
          s.mode === "mercadopago" || s.mp_token_configured
            ? "mercadopago"
            : "manual_pix"
        );
        setAcceptPix(s.accept_pix);
        setAcceptCard(s.accept_card);
        setCardFeePercent(
          String(
            s.card_fee_percent === undefined || s.card_fee_percent === null
              ? 5
              : s.card_fee_percent
          )
        );
        setPixKey(s.pix_key || "");
        setPixKeyType(s.pix_key_type || "random");
        setReceiverName(s.receiver_name || "");
        setWhatsapp(s.help_whatsapp || "");
        setNotes(s.notes || "");
        setTokenHint(s.mp_token_hint || "");
        setTokenConfigured(s.mp_token_configured);
      })
      .catch((e: Error) => onMessage(null, e.message))
      .finally(() => setLoading(false));
  }, [password, onMessage]);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    onMessage(null, null);
    try {
      const res = await fetch("/api/admin/payment", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": password,
        },
        body: JSON.stringify({
          mode: mode === "mercadopago" ? "mercadopago" : "manual_pix",
          accept_pix: acceptPix,
          accept_card: acceptCard,
          card_fee_percent: Number(String(cardFeePercent).replace(",", ".")) || 0,
          mp_access_token: mpToken.trim() || undefined,
          clear_mp_token: clearToken,
          pix_key: pixKey,
          pix_key_type: pixKeyType,
          receiver_name: receiverName,
          help_whatsapp: whatsapp,
          notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha ao salvar");
      const s = data.settings as PaymentSettings;
      setSettings(s);
      setTokenConfigured(s.mp_token_configured);
      setTokenHint(s.mp_token_hint || "");
      setMpToken("");
      setClearToken(false);
      onMessage(data.message || "Salvo!", null);
    } catch (err) {
      onMessage(null, err instanceof Error ? err.message : "Erro");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted py-8">Carregando recebimento…</p>;
  }

  return (
    <div className="space-y-6">
      {/* Guia passo a passo */}
      <div className="rounded-2xl border border-orange-200 bg-orange-50 p-5 md:p-6 shadow-sm">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-3 text-left"
          onClick={() => setHelpOpen((v) => !v)}
        >
          <div>
            <p className="font-bold text-lg text-orange-950">
              📖 Como cadastrar o recebimento (leia com calma)
            </p>
            <p className="text-sm text-orange-900/80 mt-0.5">
              Passo a passo para o organizador — sem programar
            </p>
          </div>
          <span className="text-orange-800 text-sm font-medium shrink-0">
            {helpOpen ? "Ocultar" : "Mostrar"}
          </span>
        </button>

        {helpOpen && (
          <div className="mt-5 space-y-5 text-sm text-orange-950/90 leading-relaxed">
            <p>
              O site precisa saber <strong>para quem o dinheiro vai</strong>. Você
              escolhe um dos dois jeitos abaixo.
            </p>

            <div className="rounded-xl bg-white/80 border border-orange-100 p-4 space-y-2">
              <p className="font-bold text-base">
                Opção A — Recomendada: Mercado Pago (Pix + cartão automático)
              </p>
              <ol className="list-decimal pl-5 space-y-2">
                <li>
                  Abra{" "}
                  <a
                    href="https://www.mercadopago.com.br"
                    target="_blank"
                    rel="noreferrer"
                    className="text-brand underline font-medium"
                  >
                    mercadopago.com.br
                  </a>{" "}
                  e crie conta (ou entre) com o CPF/CNPJ de quem vai{" "}
                  <strong>receber</strong> o dinheiro da corrida.
                </li>
                <li>
                  Confirme os dados e, se o site pedir, complete a verificação da
                  conta (é normal).
                </li>
                <li>
                  Entre em{" "}
                  <a
                    href="https://www.mercadopago.com.br/developers/panel/app"
                    target="_blank"
                    rel="noreferrer"
                    className="text-brand underline font-medium"
                  >
                    Suas integrações (painel de desenvolvedores)
                  </a>
                  .
                </li>
                <li>
                  Clique em <strong>Criar aplicação</strong> → nome ex.:{" "}
                  <em>Inscrições Corrida</em> → tipo pagamento online.
                </li>
                <li>
                  Abra a aplicação → copie o{" "}
                  <strong>Access Token de produção</strong> (começa com{" "}
                  <code className="bg-orange-100 px-1 rounded text-xs">
                    APP_USR-
                  </code>
                  ). Para testar sem cobrar de verdade, use o token de{" "}
                  <strong>teste</strong> (
                  <code className="bg-orange-100 px-1 rounded text-xs">
                    TEST-
                  </code>
                  ).
                </li>
                <li>
                  Volte nesta página, escolha{" "}
                  <strong>“Mercado Pago”</strong>, cole o token, marque Pix e/ou
                  cartão e clique em <strong>Salvar recebimento</strong>.
                </li>
              </ol>
              <p className="text-xs text-orange-900/70 pt-1">
                ⚠️ Não compartilhe o Access Token no WhatsApp de grupos. É como a
                senha da sua conta de recebimento.
              </p>
            </div>

            <div className="rounded-xl bg-white/80 border border-orange-100 p-4 space-y-2">
              <p className="font-bold text-base">
                Opção B — Só Pix manual (sem cartão automático)
              </p>
              <ol className="list-decimal pl-5 space-y-2">
                <li>Abra o app do seu banco → área Pix → copiar sua chave.</li>
                <li>
                  Nesta página, escolha <strong>“Pix manual”</strong>, cole a
                  chave, diga se é CPF, e-mail, telefone ou aleatória.
                </li>
                <li>
                  (Opcional) Coloque seu WhatsApp para o atleta mandar o
                  comprovante.
                </li>
                <li>
                  No painel <strong>Inscritos</strong>, marque como{" "}
                  <strong>paga</strong> quando o Pix cair na conta.
                </li>
              </ol>
              <p className="text-xs text-orange-900/70">
                Neste modo o cartão online não processa sozinho — use só se ainda
                não tiver Mercado Pago.
              </p>
            </div>

            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4">
              <p className="font-bold text-emerald-900">Como o atleta paga</p>
              <p className="text-emerald-900/90 mt-1">
                No site ele escolhe <strong>Pix</strong> ou <strong>Cartão</strong>.
                Com Mercado Pago, o pagamento é confirmado quase na hora. Com Pix
                manual, você confere e marca a inscrição como paga.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Formulário de cadastro */}
      <form
        onSubmit={onSave}
        className="rounded-2xl border border-border bg-card p-5 md:p-8 space-y-5 shadow-sm"
      >
        <div>
          <h2 className="text-lg font-bold">Cadastro do recebimento</h2>
          <p className="text-sm text-muted mt-1">
            Preencha e salve. O site usa isso no checkout.
          </p>
          {settings && tokenConfigured && (
            <p className="mt-2 text-sm text-emerald-700 font-medium">
              ✓ Mercado Pago já configurado ({tokenHint})
            </p>
          )}
        </div>

        <div>
          <p className="text-sm font-medium mb-2">Como você quer receber? *</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <ModeCard
              selected={mode === "mercadopago"}
              onClick={() => setMode("mercadopago")}
              title="Mercado Pago"
              subtitle="Pix + cartão automáticos (recomendado)"
            />
            <ModeCard
              selected={mode === "manual_pix"}
              onClick={() => setMode("manual_pix")}
              title="Pix manual"
              subtitle="Só chave Pix · você confirma no painel"
            />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <label className="flex items-center gap-3 rounded-xl border border-border bg-slate-50 px-4 py-3 cursor-pointer">
            <input
              type="checkbox"
              checked={acceptPix}
              onChange={(e) => setAcceptPix(e.target.checked)}
              className="h-5 w-5 accent-orange-600"
            />
            <span>
              <strong>Aceitar Pix</strong>
              <span className="block text-xs text-muted">
                Preço do ingresso (sem taxa extra)
              </span>
            </span>
          </label>
          <label className="flex items-center gap-3 rounded-xl border border-border bg-slate-50 px-4 py-3 cursor-pointer">
            <input
              type="checkbox"
              checked={acceptCard}
              onChange={(e) => setAcceptCard(e.target.checked)}
              className="h-5 w-5 accent-orange-600"
            />
            <span>
              <strong>Aceitar cartão</strong>
              <span className="block text-xs text-muted">
                Ingresso + taxa % (maquininha / MP)
              </span>
            </span>
          </label>
        </div>

        {acceptCard && (
          <div className="rounded-xl border border-border bg-slate-50 p-4 space-y-2">
            <label className="block">
              <span className="text-sm font-medium">
                Taxa de cartão (%) *
              </span>
              <input
                type="number"
                min={0}
                max={30}
                step={0.1}
                value={cardFeePercent}
                onChange={(e) => setCardFeePercent(e.target.value)}
                className="field mt-1.5 max-w-[10rem]"
              />
              <p className="text-xs text-muted mt-1.5 leading-relaxed">
                Repasse no cartão (ex.: maquininha Ton).{" "}
                <strong>Padrão 5%</strong>. No Pix o atleta paga só o preço do
                ingresso. Ex.: R$ 100 no Pix → cartão R${" "}
                {(
                  100 *
                  (1 +
                    (Number(String(cardFeePercent).replace(",", ".")) || 0) /
                      100)
                ).toFixed(2).replace(".", ",")}
                .
              </p>
            </label>
          </div>
        )}

        <label className="block">
          <span className="text-sm font-medium">Nome de quem recebe</span>
          <input
            value={receiverName}
            onChange={(e) => setReceiverName(e.target.value)}
            className="field mt-1.5"
            placeholder="Ex.: João Silva / Associação XYZ"
          />
        </label>

        {mode === "mercadopago" && (
          <div className="space-y-3 rounded-xl border border-border bg-slate-50 p-4">
            <label className="block">
              <span className="text-sm font-medium">
                Access Token do Mercado Pago
              </span>
              <input
                type="password"
                value={mpToken}
                onChange={(e) => setMpToken(e.target.value)}
                className="field mt-1.5 font-mono text-sm"
                placeholder={
                  tokenConfigured
                    ? "Deixe em branco para manter o atual, ou cole um novo"
                    : "Cole aqui: APP_USR-... ou TEST-..."
                }
                autoComplete="off"
              />
              <p className="text-xs text-muted mt-1">
                Onde achar: Mercado Pago → Seu negócio →{" "}
                <strong>Suas integrações</strong> → aplicação → credenciais.
              </p>
            </label>
            {tokenConfigured && (
              <label className="flex items-center gap-2 text-sm text-red-700">
                <input
                  type="checkbox"
                  checked={clearToken}
                  onChange={(e) => setClearToken(e.target.checked)}
                />
                Remover token salvo (desliga pagamento automático)
              </label>
            )}
          </div>
        )}

        {mode === "manual_pix" && (
          <div className="space-y-3 rounded-xl border border-border bg-slate-50 p-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <label className="block sm:col-span-1">
                <span className="text-sm font-medium">Tipo da chave Pix</span>
                <select
                  value={pixKeyType}
                  onChange={(e) =>
                    setPixKeyType(e.target.value as PaymentSettings["pix_key_type"])
                  }
                  className="field mt-1.5"
                >
                  <option value="random">Aleatória</option>
                  <option value="cpf">CPF</option>
                  <option value="cnpj">CNPJ</option>
                  <option value="email">E-mail</option>
                  <option value="phone">Telefone</option>
                </select>
              </label>
              <label className="block sm:col-span-1">
                <span className="text-sm font-medium">Chave Pix</span>
                <input
                  value={pixKey}
                  onChange={(e) => setPixKey(e.target.value)}
                  className="field mt-1.5"
                  placeholder="Cole sua chave Pix"
                />
              </label>
            </div>
          </div>
        )}

        <label className="block">
          <span className="text-sm font-medium">
            WhatsApp para suporte / comprovante (opcional)
          </span>
          <input
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            className="field mt-1.5"
            placeholder="11999999999"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium">Observações internas (só você vê)</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="field mt-1.5"
            placeholder="Anotações suas sobre a conta, banco, etc."
          />
        </label>

        <button
          type="submit"
          disabled={saving}
          className="w-full sm:w-auto rounded-xl bg-brand px-8 py-3 font-bold text-white hover:bg-brand-dark disabled:opacity-60"
        >
          {saving ? "Salvando…" : "Salvar recebimento"}
        </button>
      </form>
    </div>
  );
}

function ModeCard({
  selected,
  onClick,
  title,
  subtitle,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  subtitle: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        selected
          ? "rounded-xl border-2 border-brand bg-orange-50 p-4 text-left"
          : "rounded-xl border border-border bg-white p-4 text-left hover:bg-slate-50"
      }
    >
      <p className="font-bold">{title}</p>
      <p className="text-xs text-muted mt-1">{subtitle}</p>
      {selected && (
        <p className="text-[11px] font-semibold text-brand mt-2">Selecionado</p>
      )}
    </button>
  );
}
