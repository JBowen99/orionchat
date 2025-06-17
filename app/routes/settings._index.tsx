import { redirect } from "react-router";
import type { Route } from "./+types/settings._index";

export function loader({ request }: Route.LoaderArgs) {
  return redirect("/settings/account");
}
