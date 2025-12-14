import { motion } from "framer-motion";
import {
    Phone,
    FileText,
    MessageCircle,
    ShieldCheck,
    Lock,
    KeyRound,
    Globe,
} from "lucide-react";

function Illustration() {
    return (
        <div className="relative hidden lg:flex items-center justify-center overflow-hidden bg-linear-to-br from-primary/10 via-background to-primary/5">
            {/* glowing backdrop */}
            <div className="absolute inset-0 bg-gradient-radial from-primary/20 via-transparent to-transparent blur-3xl opacity-60" />

            {/* subtle floating particles */}
            {[...Array(16)].map((_, i) => (
                <motion.div
                    key={i}
                    className="absolute rounded-full bg-primary/20"
                    style={{
                        width: Math.random() * 6 + 3,
                        height: Math.random() * 6 + 3,
                        top: `${Math.random() * 100}%`,
                        left: `${Math.random() * 100}%`,
                    }}
                    animate={{ y: [0, -8, 0], opacity: [0.4, 1, 0.4] }}
                    transition={{
                        repeat: Infinity,
                        duration: 5 + Math.random() * 3,
                        delay: i * 0.3,
                    }}
                />
            ))}

            {/* central encryption visualization */}
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1 }}
                className="relative w-[500px] h-[500px] flex items-center justify-center"
            >
                {/* multiple animated rings */}
                {[...Array(6)].map((_, i) => (
                    <motion.div
                        key={i}
                        className="absolute rounded-full border border-primary/25"
                        style={{
                            width: `${160 + i * 70}px`,
                            height: `${160 + i * 70}px`,
                        }}
                        animate={{
                            scale: [1, 1.05, 1],
                            opacity: [0.7, 0.4, 0.7],
                        }}
                        transition={{
                            repeat: Infinity,
                            duration: 6 + i * 2,
                            delay: i * 0.5,
                        }}
                    />
                ))}

                {/* central secure core */}
                <motion.div
                    animate={{ scale: [1, 1.03, 1], opacity: [1, 0.9, 1] }}
                    transition={{ repeat: Infinity, duration: 3 }}
                    className="relative w-28 h-28 rounded-full bg-primary/25 backdrop-blur-md flex items-center justify-center shadow-lg"
                >
                    <ShieldCheck className="w-12 h-12 text-primary" />
                </motion.div>

                {/* rotating orbit with feature icons */}
                <motion.div
                    initial={{ rotate: 0 }}
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 30, ease: "linear" }}
                    className="absolute inset-0"
                >
                    {[
                        { icon: <MessageCircle className="w-7 h-7" />, pos: ["top-[8%]", "left-[65%]"] },
                        { icon: <Phone className="w-7 h-7" />, pos: ["bottom-[10%]", "right-[62%]"] },
                        { icon: <FileText className="w-7 h-7" />, pos: ["top-[65%]", "left-[25%]"] },
                        { icon: <Lock className="w-7 h-7" />, pos: ["top-[25%]", "right-[25%]"] },
                        { icon: <KeyRound className="w-6 h-6" />, pos: ["top-[35%]", "left-[20%]"] },
                        { icon: <Globe className="w-7 h-7" />, pos: ["bottom-[35%]", "right-[30%]"] },
                    ].map((item, i) => (
                        <motion.div
                            key={i}
                            className={`absolute ${item.pos.join(" ")} text-primary/70`}
                            animate={{ y: [0, -6, 0], opacity: [0.8, 1, 0.8] }}
                            transition={{
                                repeat: Infinity,
                                duration: 5 + i,
                                delay: i * 0.5,
                            }}
                        >
                            <div className="w-12 h-12 rounded-full bg-background/70 border shadow-sm flex items-center justify-center backdrop-blur-sm">
                                {item.icon}
                            </div>
                        </motion.div>
                    ))}
                </motion.div>

                {/* corner / edge text bubbles */}
                {[
                    { text: "Encrypted 🔒", top: "0%", left: "0%" },
                    { text: "Secure channel active", top: "0%", right: "0%" },
                    { text: "Keys exchanged ✅", bottom: "0%", left: "0%" },
                    { text: "Data synced ⚡", bottom: "0%", right: "0%" },
                    { text: "End-to-End Encryption", top: "20%", left: "3%" },
                    { text: "Private Network", top: "80%", right: "3%" },
                ].map((bubble, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: [0, 1, 0], y: [0, -10, 0] }}
                        transition={{
                            repeat: Infinity,
                            duration: 10 + i * 2,
                            delay: i * 1.5,
                        }}
                        className="absolute px-3 py-2 bg-background/70 backdrop-blur-sm border rounded-xl shadow-sm text-xs text-muted-foreground"
                        style={{
                            ...("top" in bubble ? { top: bubble.top } : {}),
                            ...("bottom" in bubble ? { bottom: bubble.bottom } : {}),
                            ...("left" in bubble ? { left: bubble.left } : {}),
                            ...("right" in bubble ? { right: bubble.right } : {}),
                        }}
                    >
                        {bubble.text}
                    </motion.div>
                ))}
            </motion.div>
        </div>
    )
}

export default Illustration