import axios from "axios";
import { headers } from "next/headers";

export async function getCurrentUser() {
  const incomingHeaders = await headers();
  const headersObject = Object.fromEntries(incomingHeaders.entries());
  try {
    const { data } = await axios.get(
      "http://ingress-nginx-controller.ingress-nginx.svc.cluster.local/api/users/currentuser",
      {
        headers: headersObject,
        timeout: 5000,
      },
    );
    return data;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown auth lookup error";
    console.error("getCurrentUser failed:", message);
    return { currentUser: null };
  }
}
