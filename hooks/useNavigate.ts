"use client";
import { useRouter } from "next/navigation";

export function useNavigate() {
    const router = useRouter();

    return (path: string) => {
        router.push(path);
    };
}

export function useBack() {
    const router = useRouter();

    const onBack = () => {
        router.back();
    };

    return onBack;
}
