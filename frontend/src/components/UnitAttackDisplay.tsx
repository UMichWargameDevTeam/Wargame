"use client"

import { useAuthedFetch } from "@/hooks/useAuthedFetch"
import { UnitInstance } from "@/lib/Types"

type UnitAttackDisplayProps = {
    unitInstance: UnitInstance
    
}

export default function UnitAttackDisplay()