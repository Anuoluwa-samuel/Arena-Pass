import { formatDate, formatMoney, formatTimeRange } from "@/lib/format"

function layout(title: string, body: string, appName: string) {
  return `<!doctype html><html><body style="margin:0;background:#0f1115;font-family:Inter,Segoe UI,Arial,sans-serif;color:#e8eaed">
  <div style="max-width:560px;margin:0 auto;padding:32px 20px">
    <div style="font-weight:700;font-size:20px;margin-bottom:24px"><span style="display:inline-block;background:#22c55e;color:#0f1115;border-radius:8px;padding:4px 8px;margin-right:8px">AP</span>${appName}</div>
    <div style="background:#171a21;border:1px solid #262a33;border-radius:16px;padding:28px">
      <h1 style="font-size:22px;margin:0 0 12px">${title}</h1>
      ${body}
    </div>
    <p style="color:#8b919c;font-size:12px;margin-top:24px">You are receiving this because you booked a session with ${appName}.</p>
  </div></body></html>`
}

export function ticketDeliveryEmail(p: {
  appName: string
  customerName: string
  ticketNumber: string
  sessionTitle: string
  startsAt: Date
  endsAt: Date
  venue: string
  teamNumber: number | null
  slotNumber: number | null
  amount: number
  currency: string
  ticketUrl: string
}) {
  const subject = `Your ticket ${p.ticketNumber} for ${p.sessionTitle}`
  const details = `
    <p style="color:#b5bac4;margin:0 0 20px">Hi ${p.customerName}, your payment is confirmed and your spot is secured.</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <tr><td style="padding:6px 0;color:#8b919c">Ticket</td><td style="padding:6px 0;text-align:right;font-weight:600">${p.ticketNumber}</td></tr>
      <tr><td style="padding:6px 0;color:#8b919c">Session</td><td style="padding:6px 0;text-align:right">${p.sessionTitle}</td></tr>
      <tr><td style="padding:6px 0;color:#8b919c">Date</td><td style="padding:6px 0;text-align:right">${formatDate(p.startsAt)}</td></tr>
      <tr><td style="padding:6px 0;color:#8b919c">Time</td><td style="padding:6px 0;text-align:right">${formatTimeRange(p.startsAt, p.endsAt)}</td></tr>
      <tr><td style="padding:6px 0;color:#8b919c">Venue</td><td style="padding:6px 0;text-align:right">${p.venue}</td></tr>
      ${p.teamNumber ? `<tr><td style="padding:6px 0;color:#8b919c">Team / Slot</td><td style="padding:6px 0;text-align:right">Team ${p.teamNumber} · Player ${p.slotNumber}</td></tr>` : ""}
      <tr><td style="padding:6px 0;color:#8b919c">Paid</td><td style="padding:6px 0;text-align:right">${formatMoney(p.amount, p.currency)}</td></tr>
    </table>
    <a href="${p.ticketUrl}" style="display:block;margin-top:24px;background:#22c55e;color:#0f1115;text-decoration:none;text-align:center;padding:14px;border-radius:10px;font-weight:600">View your digital ticket</a>
    <p style="color:#8b919c;font-size:13px;margin-top:16px">Show the QR code on your ticket at the arena entrance.</p>`
  const text = `Hi ${p.customerName},\n\nYour ticket ${p.ticketNumber} for ${p.sessionTitle} is confirmed.\n${formatDate(p.startsAt)} ${formatTimeRange(p.startsAt, p.endsAt)} at ${p.venue}.\n${p.teamNumber ? `Team ${p.teamNumber}, player ${p.slotNumber}.\n` : ""}View your ticket: ${p.ticketUrl}\n`
  return { subject, html: layout("Payment confirmed", details, p.appName), text }
}

export function sessionCancelledEmail(p: { appName: string; customerName: string; sessionTitle: string; startsAt: Date; reason: string }) {
  const subject = `Session cancelled: ${p.sessionTitle}`
  const html = layout(
    "Session cancelled",
    `<p style="color:#b5bac4">Hi ${p.customerName}, unfortunately <strong>${p.sessionTitle}</strong> on ${formatDate(p.startsAt)} has been cancelled.</p><p style="color:#b5bac4">Reason: ${p.reason}</p><p style="color:#b5bac4">Your payment will be refunded to the original payment method.</p>`,
    p.appName
  )
  return { subject, html, text: `Hi ${p.customerName}, ${p.sessionTitle} on ${formatDate(p.startsAt)} has been cancelled. Reason: ${p.reason}. Your payment will be refunded.` }
}

export function refundEmail(p: { appName: string; customerName: string; ticketNumber: string; amount: number; currency: string }) {
  const subject = `Refund issued for ${p.ticketNumber}`
  const html = layout(
    "Refund issued",
    `<p style="color:#b5bac4">Hi ${p.customerName}, we have refunded ${formatMoney(p.amount, p.currency)} for ticket ${p.ticketNumber}. It can take a few business days to appear on your statement.</p>`,
    p.appName
  )
  return { subject, html, text: `Hi ${p.customerName}, we have refunded ${formatMoney(p.amount, p.currency)} for ticket ${p.ticketNumber}.` }
}

export function sessionReminderEmail(p: { appName: string; customerName: string; sessionTitle: string; startsAt: Date; endsAt: Date; venue: string; ticketUrl: string }) {
  const subject = `Reminder: ${p.sessionTitle} is coming up`
  const html = layout(
    "See you on the pitch",
    `<p style="color:#b5bac4">Hi ${p.customerName}, <strong>${p.sessionTitle}</strong> kicks off ${formatDate(p.startsAt)} at ${formatTimeRange(p.startsAt, p.endsAt)}, ${p.venue}.</p><a href="${p.ticketUrl}" style="display:block;margin-top:20px;background:#22c55e;color:#0f1115;text-decoration:none;text-align:center;padding:14px;border-radius:10px;font-weight:600">Open your ticket</a>`,
    p.appName
  )
  return { subject, html, text: `Reminder: ${p.sessionTitle} on ${formatDate(p.startsAt)} at ${p.venue}. Ticket: ${p.ticketUrl}` }
}
