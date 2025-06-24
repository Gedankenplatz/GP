import { SignJWT } from "https://deno.land/x/jose@v5.3.0/jwt/sign.ts";
import { importPKCS8 } from "https://deno.land/x/jose@v5.3.0/key/import.ts";

Deno.serve(async (req) => {
  const { token, title, body } = await req.json();

  // Secrets aus der Umgebung
  const client_email = Deno.env.get('FCM_CLIENT_EMAIL')!;
  const private_key = Deno.env.get('FCM_PRIVATE_KEY')!.replace(/\\n/g, "\n");
  const project_id = Deno.env.get('FCM_PROJECT_ID')!;


  // JWT bauen (Google-FCM Style)
  const alg = "RS256";
  const pk = await importPKCS8(private_key, alg);

  const now = Math.floor(Date.now() / 1000);
  const jwt = await new SignJWT({
    iss: client_email,
    sub: client_email,
    aud: "https://oauth2.googleapis.com/token",
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    iat: now,
    exp: now + 3600,
  })
    .setProtectedHeader({ alg })
    .sign(pk);

  // Access Token holen
  const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
  });
  const tokenJson = await tokenResp.json();
  const access_token = tokenJson.access_token;

  // Push senden
  const url = `https://fcm.googleapis.com/v1/projects/${project_id}/messages:send`;
  const payloadToSend = {
    message: {
      token,
      notification: { title, body },
      android: { priority: "high" }
    }
  };

  const pushResp = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${access_token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payloadToSend)
  });

  if (!pushResp.ok) {
    return new Response(await pushResp.text(), { status: 500 });
  }

  return new Response(JSON.stringify({ success: true }), { status: 200 });
});
