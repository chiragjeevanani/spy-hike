# SMS OTP configuration

SMS OTP uses [SMSINDIAHUB's transactional API](https://www.smsindiahub.in/api/india/).
Configure the backend `.env` (never the frontend environment):

```dotenv
OTP_MOCK=false
OTP_MOCK_CODE=123456
SMSINDIAHUB_API_KEY=<your API key>
SMSINDIAHUB_SENDER_ID=BGADEC
SMSINDIAHUB_PE_ID=1001164203633432409
SMSINDIAHUB_TEMPLATE_ID=1007282516644508833
SMSINDIAHUB_BRAND="Find Your Trek"
```

The registered template is named `OTP`:

```text
Welcome to the ##var## powered by Appzeto.Your OTP for registration is ##var##.BGADEC
```

The first variable is `SMSINDIAHUB_BRAND`; the second is a generated six-digit
code. Punctuation and spacing follow the registered text exactly. Ensure the
sender, entity and template are mapped to your SMSINDIAHUB account with sufficient
transactional credits. Requests include `PEId` and `DLTTemplateId`.

Set `OTP_MOCK=true` to send no SMS and accept only `OTP_MOCK_CODE` (six digits).
Restart the backend after changing environment values. Mock mode deliberately
allows verification without sending a request, for local development and tests.
Do not enable it on a public deployment. Missing credentials or failed gateway
requests in live mode return an error; they never enable mock verification.

Live codes expire after five minutes, allow five verification attempts, and can
be used only once. A 30-second resend cooldown applies per mobile number.
Challenges are stored as keyed hashes in MongoDB so multiple API workers share
verification state. Resending replaces the previous challenge. The API reports
gateway acceptance, not confirmed handset delivery. Login, signup verification,
password reset and profile mobile verification use this provider. Email OTP is a
separate existing stub and is not delivered by this SMS integration.

Run the gateway and authentication checks with:

```sh
npm test -- tests/api/otpGateway.test.js tests/api/auth.test.js tests/api/phoneVerify.test.js
```

The tests replace network requests and use an isolated MongoDB database; they do
not send SMS or use your real API key. To confirm handset delivery, request an
OTP through the website using a phone number you control.
