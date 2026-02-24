import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, Check, X } from "lucide-react";
import { useProfileStore } from "@/store/useProfileStore";
import { cn } from "@/lib/utils";
import ConnectoLogo from "@/components/common/ConnectoLogo";
import ConnectoBrandAndSlogan from "@/components/common/ConnectoBrandAndSlogan";
import { toast } from "sonner";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { LANGUAGES } from "@/constants";

const AVATARS = Array.from({ length: 9 }, (_, i) => `/assets/default-avatars/${i + 1}.png`);

export default function SetProfilePage() {
    const navigate = useNavigate();
    const { setupProfile, checkUsernameAvailability, loading } = useProfileStore();

    const [username, setUsername] = useState("");
    const [bio, setBio] = useState("");
    const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0]);
    const [customAvatar, setCustomAvatar] = useState(null);
    const [usernameAvailable, setUsernameAvailable] = useState(null);
    const [checking, setChecking] = useState(false);
    const [suggestions, setSuggestions] = useState([]);
    const [primaryLanguage, setPrimaryLanguage] = useState("en");
    const [secondaryLanguage, setSecondaryLanguage] = useState("");

    /* ==========================================================
       🔹 Username availability check (debounced, min 3 chars)
       ========================================================== */
    useEffect(() => {
        const trimmed = username.trim();

        // reset if too short
        if (trimmed.length < 3) {
            setUsernameAvailable(null);
            setSuggestions([]);
            setChecking(false);
            return;
        }

        const timeout = setTimeout(async () => {
            setChecking(true);
            const result = await checkUsernameAvailability(trimmed);
            setUsernameAvailable(result.available);
            setSuggestions(result.suggestions || []);
            setChecking(false);
        }, 600);

        return () => clearTimeout(timeout);
    }, [username]);

    /* ==========================================================
       🔹 Handle Avatar Upload / Selection
       ========================================================== */
    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (!file.type.startsWith("image/")) return toast.error("Only image files are supported.");
        if (file.size > 2 * 1024 * 1024) return toast.error("Only image files are supported.");

        setCustomAvatar(file);
        setSelectedAvatar(URL.createObjectURL(file));
    };

    const handleSelectAvatar = (url) => {
        setCustomAvatar(null);
        setSelectedAvatar(url);
    };

    /* ==========================================================
       🔹 Form Submission
       ========================================================== */
    const handleSubmit = async (e) => {
        e.preventDefault();

        const trimmed = username.trim();

        if (trimmed.length < 3) {
            toast.error("Username must be at least 3 characters");
            return;
        }

        if (loading) return;

        const toastId = toast.loading("Setting up profile...");

        try {
            const formData = new FormData();

            formData.append("username", trimmed);
            formData.append("bio", bio.trim());
            formData.append("primaryLanguage", primaryLanguage);
            formData.append(
                "secondaryLanguage",
                secondaryLanguage || ""
            );

            if (customAvatar) {
                formData.append("avatar", customAvatar);
            } else {
                formData.append("avatarUrl", selectedAvatar);
            }

            await setupProfile(formData);

            toast.success("Your profile has been created successfully.", {
                id: toastId,
            });

            // slight delay so user sees success state
            await new Promise((r) => setTimeout(r, 500));

            navigate("/", { replace: true });

        } catch (err) {
            toast.error(
                err?.message ||
                "We couldn’t complete your profile setup. Please try again.",
                { id: toastId }
            );
        }
    };

    /* ==========================================================
       🔹 Render
       ========================================================== */
    return (
        <div className="min-h-screen w-full grid md:grid-cols-2 bg-background text-foreground">
            {/* ==== Left Section: Avatar + Preview ==== */}
            <div className="flex flex-col justify-center items-center p-8 md:p-16 border-b md:border-b-0 md:border-r border-border space-y-8 bg-muted/30">
                <div className="relative group">
                    <img
                        src={selectedAvatar}
                        alt="Avatar"
                        className="w-40 h-40 md:w-60 md:h-60 rounded-full border object-cover shadow-sm transition-transform duration-300 group-hover:scale-105"
                    />
                    <label
                        htmlFor="avatarUpload"
                        className="absolute bottom-2 right-2 md:right-4 bg-background border rounded-full p-2 cursor-pointer hover:bg-muted transition"
                    >
                        <Upload className="w-4 h-4 md:w-6 md:h-6" />
                    </label>
                    <input
                        id="avatarUpload"
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                    />
                </div>

                {/* Default Avatars */}
                <div className="grid grid-cols-5 gap-3">
                    {AVATARS.map((url, i) => (
                        <button
                            key={i}
                            type="button"
                            onClick={() => handleSelectAvatar(url)}
                            className={cn(
                                "w-12 h-12 rounded-full border transition hover:scale-105",
                                selectedAvatar === url ? "border-primary" : "border-transparent"
                            )}
                        >
                            <img src={url} alt={`Avatar ${i + 1}`} className="w-full h-full rounded-full object-cover" />
                        </button>
                    ))}
                </div>

                {/* Live Preview */}
                <div className="mt-6 w-full max-w-sm border rounded-xl bg-background/50 p-5 shadow-inner">
                    <h3 className="text-sm font-medium mb-3 text-center text-muted-foreground">
                        Live Preview
                    </h3>
                    <div className="flex items-center gap-3">
                        <img
                            src={selectedAvatar}
                            alt="preview"
                            className="w-12 h-12 rounded-full object-cover border"
                        />
                        <div className="flex-1 overflow-hidden">
                            <p className="font-medium truncate">{username || "your_username"}</p>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                                {bio || "Your bio will appear here..."}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ==== Right Section: Form ==== */}
            <div className="flex flex-col justify-center p-6 sm:p-12 md:p-20 space-y-10">
                <div className="flex items-center gap-3">
                    <ConnectoLogo size={52} />
                    <ConnectoBrandAndSlogan />
                </div>

                <div>
                    <h1 className="text-3xl font-semibold tracking-tight">Set up your profile</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Choose your username, bio, and language preferences.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-7">
                    {/* Username */}
                    <div className="space-y-1">
                        <Label>Username</Label>
                        <div className="relative">
                            <Input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Choose a unique username"
                                maxLength={25}
                                required
                            />
                            <div className="absolute right-3 top-2.5">
                                {checking ? (
                                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                                ) : username.trim().length > 0 && username.trim().length < 3 ? (
                                    <X className="w-4 h-4 text-destructive" />
                                ) : usernameAvailable === true ? (
                                    <Check className="w-4 h-4 text-green-500" />
                                ) : usernameAvailable === false ? (
                                    <X className="w-4 h-4 text-destructive" />
                                ) : null}
                            </div>
                        </div>

                        {username.trim().length > 0 && username.trim().length < 3 && (
                            <p className="text-xs text-destructive mt-1">
                                Username must be at least 3 characters.
                            </p>
                        )}

                        {usernameAvailable === false && suggestions.length > 0 && (
                            <div className="mt-2 text-xs text-muted-foreground">
                                Username not available! Try:
                                <div className="flex flex-wrap gap-2 mt-1">
                                    {suggestions.map((s, i) => (
                                        <button
                                            key={i}
                                            type="button"
                                            onClick={() => setUsername(s)}
                                            className="px-2 py-1 border rounded hover:bg-muted transition"
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Bio */}
                    <div className="space-y-1">
                        <Label>Bio (optional)</Label>
                        <Textarea
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                            maxLength={150}
                            placeholder="Tell us something about yourself..."
                            className="resize-none h-24"
                        />
                    </div>

                    {/* Languages */}
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-1">
                            <Label>
                                Primary Language <span className="text-destructive">*</span>
                            </Label>
                            <Select
                                value={primaryLanguage}
                                onValueChange={(value) => {
                                    if (value === secondaryLanguage) setSecondaryLanguage("");
                                    setPrimaryLanguage(value);
                                }}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select language" />
                                </SelectTrigger>
                                <SelectContent>
                                    {LANGUAGES.map((lang) => (
                                        <SelectItem key={lang.code} value={lang.code}>
                                            {lang.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1">
                            <Label>Secondary Language (optional)</Label>
                            <Select
                                value={secondaryLanguage || "none"}
                                onValueChange={(value) =>
                                    setSecondaryLanguage(value === "none" ? "" : value)
                                }
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select language" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">None</SelectItem>
                                    {LANGUAGES.filter((l) => l.code !== primaryLanguage).map((lang) => (
                                        <SelectItem key={lang.code} value={lang.code}>
                                            {lang.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Save Button */}
                    <Button
                        type="submit"
                        disabled={
                            loading ||
                            checking ||
                            username.trim().length < 3 ||
                            usernameAvailable === false
                        }
                        className="w-full py-4 text-base font-medium"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...
                            </>
                        ) : (
                            "Save & Continue"
                        )}
                    </Button>
                </form>
            </div>
        </div>
    );
}
