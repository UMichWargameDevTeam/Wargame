"use client"

import { useEffect, useState } from "react"
import { useAuthedFetch } from "./useAuthedFetch"
import { Ability, Attack, RoleInstance, TeamInstance, UnitInstance, Unit, Team } from "@/lib/Types"
import { getSessionStorageOrFetch } from "@/lib/utils"

export function useGameData(join_code: string) {
    const authedFetch = useAuthedFetch()

    const [roleInstance, setRoleInstance] = useState<RoleInstance | null>(null)
    const [teams, setTeams] = useState<Team[]>([])
    const [attacks, setAttacks] = useState<Attack[]>([])
    const [unitInstances, setUnitInstances] = useState<UnitInstance[]>([])
    const [abilities, setAbilities] = useState<Ability[]>([])
    const [units, setUnits] = useState<Unit[]>([])

    const [validationError, setValidationError] = useState<string | null>(null)

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Validate access
                const res = await authedFetch(`/api/game-instances/${join_code}/validate-map-access/`);
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || data.detail || "Access denied");
                sessionStorage.setItem('role_instance', JSON.stringify(data));
                setRoleInstance(data);

                // Unit instances
                authedFetch(`/api/game-instances/${join_code}/unit-instances/`)
                    .then(r => r.json())
                    .then(setUnitInstances);
                
                // Teams, Units, Attacks, Abilities
                getSessionStorageOrFetch<Team[]>("teams", async () => (await authedFetch("/api/teams/")).json())
                    .then(setTeams);
                getSessionStorageOrFetch<Unit[]>("units", async () => (await authedFetch("/api/units/")).json())
                    .then(setUnits);
                getSessionStorageOrFetch<Attack[]>("attacks", async () => (await authedFetch("/api/attacks/")).json())
                    .then(setAttacks);

                getSessionStorageOrFetch<Ability[]>("abilities", async() => (await authedFetch("/api/abilities/")).json())
                    .then(setAbilities)
            } catch (err) {
                if (err instanceof Error) setValidationError(err.message);
            }
        };

        fetchData();
    }, [authedFetch, join_code]);

    // change this later to expose update_units, add_units, delete_units functions instead of setUnitInstances
    return { roleInstance, teams, units, attacks, abilities, unitInstances, setUnitInstances, validationError, setValidationError };
}