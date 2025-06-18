import { Outlet } from "react-router";
import { UserProvider } from "~/contexts/user-context";

export default function Share() {
    return (
        <UserProvider>
            <div className="min-h-screen bg-background">
                <Outlet />
            </div>
        </UserProvider>
    )
}