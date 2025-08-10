// src/context/UsersContext.tsx
"use client";
import React, { createContext, useContext, useState, useEffect } from "react";
import { authed_fetch } from "@/lib/utils";

const UsersContext = createContext<any>(null);

export function UsersProvider({ children }: { children: React.ReactNode }) {
    const [users, setUsers] = useState<any[]>([]);
    const [gameInstanceId, setGameInstanceId] = useState<number | null>(null);

    // Fetch users
    const fetchUsers = async () => {
        try {
            const res = await authed_fetch("/api/users/"); // adjust endpoint if needed
            const data = await res.json();
            setUsers(data);
        } catch (error) {
            console.error("Error fetching users:", error);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    // Keep gameInstanceId from sessionStorage
    useEffect(() => {
        const storedId = sessionStorage.getItem("gameInstanceId");
        if (storedId) setGameInstanceId(parseInt(storedId));
    }, []);

    const filteredUsers = gameInstanceId
        ? users.filter((u) => u.game_instance?.id === gameInstanceId)
        : users;

    return (
        <UsersContext.Provider value={{ users: filteredUsers, setGameInstanceId }}>
            {children}
        </UsersContext.Provider>
    );
}

export function useUsers() {
    return useContext(UsersContext);
}
