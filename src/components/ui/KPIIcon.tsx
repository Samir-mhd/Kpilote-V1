"use client";

import {

    Trophy,

    Flame,

    Target,

    Zap,

    Brain,

    Swords,

    Bell,

    TrendingUp,

    Package,

    Users,

} from "lucide-react";

type Props = {

    name:
        | "trophy"
        | "flame"
        | "target"
        | "zap"
        | "brain"
        | "challenge"
        | "bell"
        | "trend"
        | "box"
        | "users";

    size?: number;

};

export default function KPIIcon({

    name,

    size = 24,

}: Props) {

    const props = {

        size,

        strokeWidth: 2.4,

    };

    switch (name) {

        case "trophy":

            return <Trophy {...props}/>;

        case "flame":

            return <Flame {...props}/>;

        case "target":

            return <Target {...props}/>;

        case "zap":

            return <Zap {...props}/>;

        case "brain":

            return <Brain {...props}/>;

        case "challenge":

            return <Swords {...props}/>;

        case "bell":

            return <Bell {...props}/>;

        case "trend":

            return <TrendingUp {...props}/>;

        case "box":

            return <Package {...props}/>;

        case "users":

            return <Users {...props}/>;

        default:

            return <Target {...props}/>;

    }

}