<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
    x: number,
    y: number,
    food: number,
    bubbles: number,
    bubble_value: number,
    activateDebugBuild: boolean,
}>();

const foodAngle = computed(() => Math.min(1, Math.sqrt(props.food) / 20) * 2 * Math.PI);
</script>

<template>
    <g
        :transform="`translate(${x} ${y})`"
    >
        <circle
            cx="0" cy="0"
            :fill="`rgb(${bubbles}, 0, ${bubble_value * 10})`"
            r="16"
            ></circle>
        <path
            :d="`
                M 0 0
                l ${-14 * Math.sin(foodAngle)} ${-14 * Math.cos(foodAngle)}
                A 14 14 0 ${foodAngle < Math.PI ? '1' : '0'} 0 0 -14
                Z
            `"
            fill="#a30914"
        ></path>
        <text
            v-if="activateDebugBuild"
            x="-10"
            y="0"
            fill="white"
            style="font-size: 12px"
            >{{ bubbles }}/{{ Math.round(bubble_value) }}</text>
        <!--<text
            x="-8"
            y="12"
            fill="white"
            style="font-size: 12px"
            >{{ Math.round(food) }}</text>-->
    </g>
</template>
