<script setup lang="ts">
import { onMounted, onUnmounted, computed, ref, watch, shallowRef, triggerRef } from "vue";
import { dbg, init, tick, econ, random_pos, params } from "./state.ts";
import { scale, normalize, sub, add, type Vec2 } from "./vector-algebra.ts";
import Grave from './Grave.vue';
import Econ from "./Econ.vue";
import { doTutorial } from './tutorial';

const state = shallowRef(init());

//let speed: number|undefined = undefined;
let isPaused = ref(false);
let activateMaxSpeed = ref(false);
let cashOut = ref(false);
let activateDebugBuild = ref(false);
let isGameOver = ref(false);
let validCheatCode = ref("123454321"); // TO DO: deactivate shortcuts while entering cheat code; for now, cheat code should not contain any shortcuts
let cheatCodeInput = ref("");
let isCheatCodeValid = ref(false);
let selectedSvg = ref("BubblePrice");

const tutorialDone = ref<boolean>(localStorage.getItem("tutorialDone") !== null);
const tutorialHighlighter = ref<Vec2|null>(null);

watch(tutorialDone, (val: boolean) => {
  if(val) localStorage.setItem("tutorialDone", "y");
  else {
    localStorage.removeItem("tutorialDone");
    doTutorial(isPaused, state, tutorialHighlighter, placing).then(() => { tutorialDone.value = true; });
  }
});

const update = () => {
  if (!isPaused.value) {
    let alive = tick(state.value);
    if (alive && activateMaxSpeed.value) {
      for (let i = 0; i < 10; i++) {
        if (!tick(state.value)) {
          alive = false;
          break;
        };
      }
    }

    handleGameOver(alive);

    if (cashOut.value) {
      handleCashOut();
    }
  }
  triggerRef(state);
  requestAnimationFrame(update);
};


// Function to handle key press
const handleKeyPress = (event: KeyboardEvent) => {
  switch (event.code) {
    case "Space":
      event.preventDefault(); // Prevent scrolling
      togglePause();
      break;
    case "ShiftLeft":
      event.preventDefault(); // Prevent scrolling
      toggleMaxSpeed();
      break;
    case "KeyC":
      event.preventDefault(); // Prevent scrolling
      cashOut.value = true;
      break;
    case "KeyB":
      event.preventDefault(); // Prevent scrolling
      placing.value = "billboardFirstLeg";
      break;
    case "KeyR":
      event.preventDefault(); // Prevent scrolling
      tutorialDone.value = false
      event.stopPropagation();
      break;
  }
};

const handleGameOver = (alive: boolean) => {
    console.log("hgo");
    if (!alive) {
      window.alert("Game Over! You can't feed your marketing department / influencer hype-squad anymore!");
      reset();
    }

    if ((state.value.econs.length === 0) && !isGameOver.value) {
      isGameOver.value = true;
      return; // need to draw one more tick so that last econ icon changes to cross
    }
    if (isGameOver.value) {
      window.alert("Everyone is dead! Take the money and run!");
      handleCashOut();
    }
};

const handleCashOut = () => {
  let cashOutval = Math.round(state.value.player.food * 100) / 100;
  let prevHighScore = Math.round(state.value.highscore * 100) / 100;
  if (state.value.player.food > state.value.highscore) {
    window.alert(`Cashed out! You collected $${cashOutval}! This is a new highscore! (Previous highscore: $${prevHighScore})`);
  } else {
    window.alert(`Cashed out! You collected $${cashOutval}. Try again to beat your highscore of $${prevHighScore}!`);
  }
  reset();
};

const checkCheatCode = () => {
      isCheatCodeValid.value = cheatCodeInput.value === validCheatCode.value;
};

const togglePause = () => {
  isPaused.value = !isPaused.value;
};

const toggleDebug = () => {
  activateDebugBuild.value = !activateDebugBuild.value;
};

const toggleMaxSpeed = () => {
  activateMaxSpeed.value = !activateMaxSpeed.value;
};

const svgElement = ref<SVGGraphicsElement | undefined>();

const mouseMove = (e: MouseEvent) => {
    const element = (e.target! as SVGGraphicsElement);
    const ctm = element.getCTM();

    if (ctm === null) { return; }

    const point = (new DOMPoint(e.offsetX, e.offsetY)).matrixTransform(ctm.inverse());

    mousePos.value = {
      x: point.x,
      y: point.y,
    };
};

watch(svgElement, function (svgElement) {
  if (svgElement !== undefined) {
    svgElement.addEventListener("mousemove", e => {
      mouseMove(e);
    });
    svgElement.addEventListener("mouseleave", e => {
      mousePos.value = null
      // debugger;
    });
  }
});

const mousePos = ref<Vec2 | null>(null);//{x: 0, y: 0};

onMounted(() => {
  window.addEventListener("keydown", handleKeyPress);
  update();
  if(!tutorialDone.value) {
    setTimeout(() => { doTutorial(isPaused, state, tutorialHighlighter, placing).then(() => { tutorialDone.value = true; }); }, 1000);
  }
});

onUnmounted(() => {
  window.removeEventListener("keydown", handleKeyPress);
});

const placing = ref<"bubbles" | "billboardFirstLeg" | "billboardSecondLeg" | null>(null);
const previousLeg = ref<Vec2|null>(null);
const nextLeg = computed(() => {
  let result = add(previousLeg.value, scale(normalize(sub(mousePos.value, previousLeg.value)), params.billboard_length));
  return result;
});

const marketingDevices = computed(() => ({
  billboard: state.value.player.marketing_points >= params.billboard_price,
  influencer: state.value.player.marketing_points >= 50,
}));

const bulk_place_bubbles = (amount: number) => {
  for (let i = 0; i < amount; i++) {
    if (state.value.player.bubbles === 0) {
      return;
    }
    state.value.bubbles.push(random_pos());
    state.value.player.bubbles -= 1;
  }
};

const rug_pull = () => {
  for (let i = 0; i < state.value.player.bubbles; i++) {
    state.value.bubbles.push(random_pos());
  }
  state.value.player.bubbles = 0;
};

const place_influencer = () => {
  state.value.influencers.push({
    pos: random_pos(),
    velocity: {
        x: Math.random() * 2 - 1,
        y: Math.random() * 2 - 1,
    },
  });
};

const onSvgClick = () => {
  const pos = mousePos.value!;

  switch (placing.value) {
    case "bubbles":
      if (state.value.player.bubbles <= 0) {
        return;
      }
      state.value.bubbles.push(pos);
      state.value.player.bubbles -= 1;
      return;
      // break;
    case "billboardFirstLeg":
      if (state.value.player.marketing_points < params.billboard_price) {
        return;
      }
      previousLeg.value = pos;
      placing.value = "billboardSecondLeg";
      break;
    case "billboardSecondLeg":
      state.value.billboards.push([previousLeg.value!, nextLeg.value]);
      state.value.player.marketing_points -= params.billboard_price;
      placing.value = state.value.player.marketing_points < params.billboard_price
        ? null
        : "billboardFirstLeg";
  };
}

const reset = () => {
  if (state.value.player.food > state.value.highscore) {
    state.value.highscore = state.value.player.food;
  }
  window.localStorage.setItem("highscore", String(state.value.highscore));
  state.value = init();
  isPaused.value = false;
  activateMaxSpeed.value = false;
  cashOut.value = false;
  isGameOver.value = false;
};


const max_price = computed(() => {
  return Math.max(0, ...state.value.price_history);
});

const max_player_food = computed(() => {
  return Math.max(0, ...state.value.player_food_history);
});

const max_global_cash = computed(() => {
  return Math.max(0, ...state.value.global_cash_history);
});

const printNumber = (number: number) => {
  return (Math.round(number * 100) / 100).toFixed(1)
}

const calculateTrend = (numberArray: number[], length: number) => {
  if (numberArray.length < length) {
    return 0;
  }
  return (numberArray.slice(-1)[0] - numberArray.slice(-length)[0]) / (length-1);
}

const playerCashTrend = computed(() => {
  return calculateTrend(state.value.player_food_history, 7);
});

const bubbleTrend = computed(() => {
  return calculateTrend(state.value.price_history, 7);
});

const globalCashTrend = computed(() => {
  return calculateTrend(state.value.global_cash_history, 7);
});

</script>

<template>
  <div style="display: flex; gap: 16px; padding: 16px; width: 100%; height: 100%">
    <svg
      style="flex-grow: 2; width: 100%; height: 100%; pointer-events: visible;"
      viewBox="-512 -512 1024 1024"
      ref="svgElement"
      id="svgCanvas"
      @click="onSvgClick"
    >
      <circle
        r="512"
        fill="lightblue"
      ></circle>

      <template
        v-for="econ in state.dead_econs"
      >
        <Grave
          :cx="econ.pos.x"
          :cy="econ.pos.y"
        ></Grave>
      </template>

      <template
        v-for="pos in state.food"
      >
        <circle
          :cx="pos.x"
          :cy="pos.y"
          r="16"
          fill="LightGreen"
          stroke="green"
        ></circle>

        <text
          :x="pos.x - 7"
          :y="pos.y + 8"
          fill="green"
          style="font-size: 24px; font-family: monospace;"
        >$</text>
      </template>

      <template
        v-for="pos in state.bubbles"
      >
        <circle
          :cx="pos.x"
          :cy="pos.y"
          r="16"
          fill="#90a0ff70"
          stroke="blue"
          stroke-width="2"
        ></circle>
      </template>

      <template
        v-for="pos in state.billboards"
      >
        <line
          :x1="pos[0].x"
          :y1="pos[0].y"
          :x2="pos[1].x"
          :y2="pos[1].y"
          stroke-width="4"
          stroke="red"
        ></line>
      </template>

      <template
        v-for="econ in state.econs"
      >
          <Econ
            :x="econ.pos.x"
            :y="econ.pos.y"
            :food="econ.food"
            :bubbles="econ.bubbles"
            :bubble_value="econ.bubble_value"
            :activate-debug-build="activateDebugBuild"
          ></Econ>
      </template>

      <template
        v-for="influencer in state.influencers"
      >
        <circle
          :cx="influencer.pos.x"
          :cy="influencer.pos.y"
          fill="red"
          r="16"
        ></circle>

        <text
          :x="influencer.pos.x - 7"
          :y="influencer.pos.y + 8"
          fill="white"
          style="font-size: 24px; font-family: monospace;"
        >I</text>
      </template>

      <template
        v-for="popup in state.cash_popups"
      >
        <text
          :x="popup.pos.x"
          :y="popup.pos.y"
          fill="green"
          :fill-opacity="`${popup.remaining_time / 60}`">${{ Math.round(popup.value * 100) / 100 }}
        </text>
      </template>

      <template v-if="mousePos !== null">
        <circle
          v-if="placing === 'billboardFirstLeg'"
          :cx="mousePos.x"
          :cy="mousePos.y"
          r="16"
          @click="place"
          fill="red"
        ></circle>

        <circle
          v-else-if="placing === 'bubbles'"
          :cx="mousePos.x"
          :cy="mousePos.y"
          r="16"
          @click="place"
          fill="#90a0ff70"
          stroke="blue"
          stroke-width="2"
        ></circle>

        <line
          v-else-if="placing === 'billboardSecondLeg'"
          :x1="previousLeg.x"
          :y1="previousLeg.y"
          :x2="nextLeg.x"
          :y2="nextLeg.y"
          stroke-width="8"
          stroke="red"
        ></line>
      </template>

      <circle
        v-if="tutorialHighlighter !== null"
        r="30"
        :cx="tutorialHighlighter.x"
        :cy="tutorialHighlighter.y"
        class="tutorial-highlight"
        fill="transparent"
        stroke="yellow"
        stroke-width="2px"
      ></circle>

    </svg>

    <!----------------- MENU ----------------->

    <div style="flex-grow: 1; width: 100%; height: 100%">

      <div class="container mt-4">
          <!-- Grid Row for Buttons -->
          <div class="row text-center">
            
            <div class="col">
              <button class="btn btn-primary" type="button" @click=togglePause>{{ isPaused ? 'Unpause' : 'Pause' }}</button>
            </div> 

            <div class="col">
              <button class="btn btn-primary" type="button" @click=toggleMaxSpeed>{{ activateMaxSpeed ? 'Normal Speed' : 'Max Speed' }}</button>
            </div>  

            <div class="col">
              <button class="btn btn-primary" type="button" @click="cashOut = true">Cash Out</button>
            </div>

            <div class="col">
              <button class="btn btn-primary" v-if="tutorialDone" @click="ev => { tutorialDone = false; ev.stopPropagation(); }">Redo tutorial</button>
            </div>
        </div>

          <!-- Grid Row for shortcuts -->
        <div class="row text-center  mt-2">
          <div class="col">
            Space
          </div>
          <div class="col">
            Shift
          </div>
          <div class="col">
            C
          </div>
          <div class="col">
            <div v-if="tutorialDone" >R</div>
          </div>
        </div>
      </div>

      <!----------------- MARKETING ----------------->

      <hr>
      <h4>Marketing Points: {{ state.player.marketing_points }} MP</h4>
      <div>Marketing Cost: <span :style="{ color: state.playerFoodCostPerSecond == 0 ? 'LightGreen' : 'red' }"><span v-if="state.playerFoodCostPerSecond > 0">-</span>${{ state.playerFoodCostPerSecond }}</span> / second</div>

      <div class="container mt-4">
        <!-- Grid Row for Buttons -->
        <div class="row text-center">
          <div class="col">
            <button class="btn btn-primary"
            @click="state.player.marketing_points += params.marketing_point_increment"
            :disabled="isPaused"
            id="marketingFirstButton"
          >Brainstorm</button>
          </div>
          <div class="col">
            <button class="btn btn-primary"
            :disabled="state.player.marketing_points < params.billboard_price"
            @click="placing = 'billboardFirstLeg'"
            id="marketingBillboardButton"
          >
            Deploy Billboard
          </button>
          </div>
          <div class="col">
            <button class="btn btn-primary"
          :disabled="state.player.food <= 2 * state.player.marketing_people * params.marketing_person_salary + params.marketing_person_salary"
            @click="state.player.marketing_people += 1"
          >
            Hire Marketer
          </button>
          </div>
          <div class="col">
            <button class="btn btn-primary"
            :disabled="state.player.food <= params.influencer_salary"
            @click="place_influencer"
          >
            Hire Influencer
          </button>
          </div>
        </div>

        <!-- Grid Row for Text -->
        <div class="row text-center mt-2">
          <div class="col">
            <span style="margin-left: 6px;">+1 MP</span>
          </div>
          <div class="col">
            <span style="margin-left: 6px;">+{{printNumber(params.billboard_influence_strength*60)}} influence / second <br>-{{ params.billboard_price }} MP</span>
          </div>
          <div class="col">
            <span style="margin-left: 6px;">+1 MP / second<br> -${{ 2 * state.player.marketing_people * params.marketing_person_salary + params.marketing_person_salary }} / second</span>
          </div>
          <div class="col">
            <span style="margin-left: 6px;">+{{printNumber(params.influencer_influence_strength*60)}} influence / second <br>-${{ params.influencer_salary }} / second</span>
          </div>
        </div>
      </div>

      <div v-if="activateDebugBuild">
        <button class="btn btn-primary"
            @click="state.player.marketing_points += 100"
          >+100 Marketing Points
        </button>
        <br>
      </div>

      <!----------------- PLAYER ECONOMY ----------------->

      <hr>
      <h4>Bubble Stockpile: {{ state.player.bubbles }}</h4>

      <div class="container mt-4">
        <!-- Grid Row for Buttons -->
        <div class="row text-center">
          <div class="col">
            <button class="btn btn-primary" 
              id="placeBubblesButton"
              @click="placing === 'bubbles' ? placing = null : placing = 'bubbles'"
            > Place Bubble</button>
          </div>
          <div class="col">
            <button class="btn btn-primary" @click="() => bulk_place_bubbles(params.bubbles_bulk_place_amount)">Place {{ params.bubbles_bulk_place_amount }} Bubbles</button>
          </div>
          <div class="col">
            <button class="btn btn-primary" @click="() => bulk_place_bubbles(2*params.bubbles_bulk_place_amount)">Place {{ 2*params.bubbles_bulk_place_amount }} Bubbles</button>
          </div>
          <div class="col">
            <button class="btn btn-primary" @click="rug_pull">Pull Rug</button>
          </div>
        </div>

        <!-- Grid Row for Text -->
        <div class="row text-center mt-2">
        </div>

      </div>  

      <div v-if="activateDebugBuild">
        <button class="btn btn-primary"
            @click="state.player.food += 1000"
          >+$1000
        </button>
      </div>
      <div style="margin-top: 0.5em"></div>

      <!---<span style="font-family: monospace;">Bubble Stockpile: {{ state.player.bubbles }}</span>--->

      <div class="grid-container">
        <div>
          <span style="font-family: monospace;">Liquidity:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span> <span class="fixed-width">${{ printNumber(state.player.food) }} </span>
        </div>
        <div>
          <span style="font-family: monospace;">Highscore:</span> <span class="fixed-width">${{printNumber(state.highscore) }}</span>
        </div>  
          <div>
            <span style="font-family: monospace;">Trend:</span> <span class="fixed-width" :style="{ color: playerCashTrend >= 0 ? 'LightGreen' : 'red' }">${{printNumber(playerCashTrend) }}</span>  / second
          </div>  
      </div>

      <svg
        v-if="state.player_food_history.length > -1"
        width="100%"
        height="128"
        preserveAspectRatio="none"
        viewBox="0 0 256 128"
      >
        <polygon
          :points="
            '256,128 0,128 '
              + state.player_food_history
                  .map((p, i) => `${256 / (state.player_food_history.length - 1) * i},${128 - p / max_player_food * 128}` )
                  .join(' ')
          "
          fill="LightGreen"
        ></polygon>
      </svg>

      <!----------------- GLOBAL ECONOMY ----------------->

      <hr>
      <h4>Global Economy</h4>

      <span style="font-family: monospace;">Alive: {{state.econs.length}} / {{state.econs.length + state.dead_econs.length}}</span> 
      <br>
      <span v-if="activateDebugBuild" style="margin-left: 6px;">(Bubble Deprecation factor: {{ printNumber(state.deprecationFactor)}})</span>


      <div>
        <!-- Radio Buttons -->
        <div class="grid-container">

          <label>
            <input type="radio" v-model="selectedSvg" value="BubblePrice" /> <span style="font-family: monospace;">Bubble Price:</span> <span class="fixed-width">${{printNumber(state.price_history.slice(-1)[0])}}</span>
          </label>

          <div>
            <span style="font-family: monospace;">Max:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span> <span class="fixed-width">${{ printNumber(max_price) }}</span>
          </div>

          <div>
            <span style="font-family: monospace;">Trend:</span> <span class="fixed-width" :style="{ color: bubbleTrend >= 0 ? 'LightGreen' : 'red' }">${{ printNumber(bubbleTrend) }}</span> / second
          </div>

          <label>
            <input type="radio" v-model="selectedSvg" value="GlobalCash" /> <span style="font-family: monospace;">Total Cash:&nbsp;&nbsp;</span>  <span class="fixed-width">${{printNumber(state.totalEconCash)}}</span>
          </label>

          <div>
            <span style="font-family: monospace;">Average:&nbsp;&nbsp;</span> <span class="fixed-width">${{printNumber(state.avgEconCash)}}</span>
          </div>

          <div>
            <span style="font-family: monospace;">Trend:</span> <span class="fixed-width" :style="{ color: globalCashTrend >= 0 ? 'LightGreen' : 'red' }">${{ printNumber(globalCashTrend) }}</span> / second
          </div>

        </div>
      </div>

      <br>
      <br>
      <svg
        v-if="selectedSvg == 'BubblePrice' && state.price_history.length > -1"
        width="100%"
        height="128"
        preserveAspectRatio="none"
        viewBox="0 0 256 128"
      >
        <polygon
          :points="
            '256,128 0,128 '
              + state.price_history
                  .map((p, i) => `${256 / (state.price_history.length - 1) * i},${128 - p / max_price * 128}` )
                  .join(' ')
          "
          fill="#a0bff1"
        ></polygon>
      </svg>

      <svg
        v-if="selectedSvg == 'GlobalCash' && state.global_cash_history.length > -1"
        width="100%"
        height="128"
        preserveAspectRatio="none"
        viewBox="0 0 256 128"
      >
        <polygon
          :points="
            '256,128 0,128 '
              + state.global_cash_history
                  .map((p, i) => `${256 / (state.global_cash_history.length - 1) * i},${128 - p / max_global_cash * 128}` )
                  .join(' ')
          "
          fill="LightGreen"
        ></polygon>
      </svg>

      <br>
      <template v-if="activateDebugBuild" v-for="param, name in params">
        <br>
        {{ name }}:
        <input type="number" v-model="params[name]"/>
      </template>
      <br>
      <hr>
     <br>
     <br>
     <br>
     <br>
     <br>
     <br>
     <br>
     <br>
      <!-- Input field for entering the cheat code -->
      <input 
        v-if="!isCheatCodeValid"
        type="text" 
        v-model="cheatCodeInput" 
        placeholder="Enter cheat code"
        @input="checkCheatCode"
      />

      <div class="col">
              <!-- Button is displayed only when cheat code is correct -->
              <button class="btn btn-primary" 
                v-if="isCheatCodeValid" 
                type="button" 
                @click="toggleDebug"
              >
                {{ activateDebugBuild ? 'Deactivate Debug' : 'Activate Debug' }}
              </button>
            </div>

      <div class="col">
        <button class="btn btn-primary" v-if="activateDebugBuild" type="button" @click="reset">Reset</button>
      </div>

    </div>
  </div>
</template>

<style scoped>
  .tutorial-highlight:not(:disabled) {
    animation-name: blink-border;
    animation-duration: 2s;
    animation-timing-function: ease-in;
    animation-iteration-count: infinite;
  }

  .fixed-width {
    display: inline-block;
    width: 80px;
    text-align: right;
    font-family: monospace;
  }

  .grid-container {
    display: grid;
    grid-template-columns: repeat(3, auto);
    gap: 10px;
  }

  @keyframes blink-border {
    from {
      border: 2pt solid yellow;
    }
    to {
      border: 2pt solid transparent;
    }
  }

  @keyframes blink {
    from { stroke: yellow; }
    to { stroke: transparent; }
  }

  #tutorialHighlightSvg {
    animation-name: blink;
  }
</style>
