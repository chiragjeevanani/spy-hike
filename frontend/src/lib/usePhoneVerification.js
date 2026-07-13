/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Shared phone-OTP verification state machine for the signup flows (customer +
// organizer). Manages send → enter code → verify, exposes a `phoneToken` to
// hand to the register call, and auto-resets if the mobile is edited after
// verifying so a stale token can't be submitted for a different number.

import { useState, useEffect, useCallback, useRef } from 'react';
import authApi from './authApi';

const digits = (s) => String(s || '').replace(/\D/g, '');

export function usePhoneVerification(mobile) {
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState('');
  const [verified, setVerified] = useState(false);
  const [token, setToken] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const verifiedMobileRef = useRef(null);

  // Any edit to the number after a send/verify invalidates the flow.
  useEffect(() => {
    if (verifiedMobileRef.current !== null && mobile !== verifiedMobileRef.current) {
      verifiedMobileRef.current = null;
      setSent(false); setVerified(false); setToken(null); setCode(''); setError(''); setInfo('');
    }
  }, [mobile]);

  const send = useCallback(async () => {
    setError(''); setInfo('');
    if (digits(mobile).length < 10) { setError('Enter a valid 10-digit mobile number.'); return false; }
    setBusy(true);
    try {
      await authApi.requestOtp(mobile);
      verifiedMobileRef.current = mobile; // track the number the OTP was sent to
      setSent(true);
      setInfo('OTP sent to your mobile (demo code: 123456)');
      return true;
    } catch (err) {
      setError(err?.message || 'Could not send OTP. Please try again.');
      return false;
    } finally { setBusy(false); }
  }, [mobile]);

  const verify = useCallback(async () => {
    setError(''); setInfo('');
    setBusy(true);
    try {
      const res = await authApi.verifyPhone(mobile, code || '123456');
      verifiedMobileRef.current = mobile;
      setVerified(true);
      setToken(res.phoneToken);
      setInfo('Mobile number verified!');
      return true;
    } catch (err) {
      setError(err?.message || 'Incorrect OTP. Use the demo code 123456.');
      return false;
    } finally { setBusy(false); }
  }, [mobile, code]);

  const reset = useCallback(() => {
    verifiedMobileRef.current = null;
    setSent(false); setVerified(false); setToken(null); setCode(''); setError(''); setInfo('');
  }, []);

  return { sent, code, setCode, verified, token, busy, error, info, send, verify, reset };
}

export default usePhoneVerification;
