/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// PayU Hosted Checkout is a full-page form POST, not an embeddable widget: the
// browser leaves the app, pays on PayU's page, and PayU posts the result to the
// backend, which redirects back to /app/book/:tripId?booking=…&payment=return.
//
// The form fields (including the hash) are built and signed by the server; the
// client only submits them unchanged — altering any field breaks the hash and
// PayU rejects the payment.
export function redirectToPayU(checkout) {
  if (!checkout?.action || !checkout?.params) {
    throw new Error('Payment could not be started. Please try again.');
  }

  const form = document.createElement('form');
  form.method = checkout.method || 'POST';
  form.action = checkout.action;
  form.style.display = 'none';

  for (const [name, value] of Object.entries(checkout.params)) {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = value == null ? '' : String(value);
    form.appendChild(input);
  }

  document.body.appendChild(form);
  form.submit();
}

export default redirectToPayU;
