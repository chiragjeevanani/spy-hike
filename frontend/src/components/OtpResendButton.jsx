export default function OtpResendButton({ cooldown, busy, onClick, label = 'Resend OTP' }) {
  return (
    <button
      type="button"
      disabled={busy || cooldown.seconds > 0}
      onClick={onClick}
      className="text-xs font-semibold text-spy-orange disabled:text-zinc-500 disabled:cursor-not-allowed py-2"
    >
      {cooldown.seconds > 0 ? `${label} in ${cooldown.seconds}s` : label}
    </button>
  );
}
