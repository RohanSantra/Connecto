import { useEffect } from "react";
import { useDeviceStore } from "@/store/useDeviceStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Monitor, Smartphone, Laptop, LogOut, Star } from "lucide-react";
import { toast } from "sonner";

/**
 * 💻 DevicesPage
 * Manage linked devices, sessions, and primary device selection.
 */
export default function DevicesPage() {
    const { devices, loading, fetchDevices, makePrimaryDevice, logoutDevice } = useDeviceStore();

    /* ==========================================================
       🔹 Load device list on mount
       ========================================================== */
    useEffect(() => {
        fetchDevices();
    }, []);

    /* ==========================================================
       🔹 Device Type Icon Helper
       ========================================================== */
    const getDeviceIcon = (type) => {
        switch (type) {
            case "desktop": return <Monitor className="w-5 h-5" />;
            case "laptop": return <Laptop className="w-5 h-5" />;
            case "mobile": return <Smartphone className="w-5 h-5" />;
            default: return <Monitor className="w-5 h-5" />;
        }
    };

    /* ==========================================================
       🔹 Handle Device Actions
       ========================================================== */
    const handleMakePrimary = async (deviceId) => {
        const res = await makePrimaryDevice(deviceId);
        if (res) toast.success("Primary device updated");
    };

    const handleLogoutDevice = async (deviceId) => {
        const res = await logoutDevice(deviceId);
        if (res) toast.success("Device logged out successfully");
    };

    /* ==========================================================
       🔹 Render
       ========================================================== */
    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="p-6 sm:p-10 flex flex-col gap-6">
            <div>
                <h1 className="text-2xl font-semibold">Linked Devices</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Manage all devices connected to your Connecto account.
                </p>
            </div>

            {devices.length === 0 ? (
                <div className="text-center py-20 text-muted-foreground">
                    No devices linked yet.
                </div>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {devices.map((device) => (
                        <Card key={device._id} className="hover:shadow-sm transition">
                            <CardHeader className="flex items-center justify-between space-y-0">
                                <div className="flex items-center gap-2">
                                    {getDeviceIcon(device.type)}
                                    <CardTitle className="text-base font-medium">
                                        {device.deviceName || "Unknown Device"}
                                    </CardTitle>
                                </div>
                                {device.isPrimary && (
                                    <Badge variant="outline" className="text-xs">
                                        Primary
                                    </Badge>
                                )}
                            </CardHeader>

                            <CardContent className="mt-2 space-y-2 text-sm text-muted-foreground">
                                <p><strong>Last Active:</strong> {new Date(device.lastActive).toLocaleString()}</p>
                                <p><strong>IP:</strong> {device.ipAddress || "N/A"}</p>
                                <div className="flex gap-2 mt-3">
                                    {!device.isPrimary && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleMakePrimary(device._id)}
                                        >
                                            <Star className="w-4 h-4 mr-1" /> Make Primary
                                        </Button>
                                    )}
                                    <Button
                                        size="sm"
                                        variant="destructive"
                                        onClick={() => handleLogoutDevice(device._id)}
                                    >
                                        <LogOut className="w-4 h-4 mr-1" /> Logout
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Floating Add Device (Optional for Future) */}
            <div className="fixed bottom-16 right-6 sm:bottom-8 sm:right-8">
                <Button size="lg" className="rounded-full shadow-lg">
                    + Add Device
                </Button>
            </div>
        </div>
    );
}
