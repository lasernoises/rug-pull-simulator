import { reactive, computed } from "vue";
import type { Vec2 } from "./vector-algebra";
import { length, sub, rebound, minus, scalarProduct, dist, normalize } from './vector-algebra';

export function dbg<T>(t: T): T {
  console.log(t);
  return t;
}

interface Trader {
  food: number;
  bubbles: number;
};

export type Econ = {
  pos: Vec2,
  velocity: Vec2,

  food: number;
  bubbles: number;

  bubble_value_raw: number;
  bubble_value: number;
};

export function econ(pos: Vec2, velocity: Vec2): Econ {
  return {
    pos,
    velocity,
    food: params.econ_initial_food,
    bubbles: 0,
    bubble_value_raw: 0,
    bubble_value: 0, // adjusted for deprecation
  };
}

export type Player = {
  bubbles: number,
  food: number,
  selling_price: number,
  buying_price: number,
  marketing_points: number,
};

export const params = reactive({
  food_spawn_chance: 0.03,
  player_initial_bubbles: 512,
  market_trade_radius: 40,
  econ_initial_food: 30,
  econ_min_distance: 32,
  econ_velocity_change_chance: 0.01,
  econ_bubble_collection_radius: 32,
  econ_food_collection_radius: 64,
  econ_food_consumption: 0.01,
  food_value: 16,
  bubbles_bulk_place_amount: 10,
  billboard_influence_radius: 128,
  billboard_influence_strength: 0.001,
  billboard_length: 50,
  billboard_price: 20,
  influencer_price: 50,
  marketing_point_increment: 20,
});

export type State = {
  player: Player,
  econs: Econ[],
  dead_econs: Econ[],
  billboards: [Vec2, Vec2][],
  food: Vec2[],
  bubbles: Vec2[],
  last_trade: { amount: number, price: number } | null,
  price_history: number[],
  avgValue: number, // avg bubble value
  deprecationFactor: number,
  highscore: number,
};

export function init(): State {
  return reactive({
    player: {
      bubbles: params.player_initial_bubbles,
      marketing_points: 0,
      food: 0,
      buying_price: 0, selling_price: 100,
    },
    billboards: [],
    food: [],
    bubbles: [],
    last_trade: null,
    price_history: [],
    econs: 
      n_random_pos_no_collisions(32, params.econ_min_distance).map(pos => econ(
      // [...Array(Math.round(Math.random() * 32)).keys()].map(() => econ(
        pos,
        {
          x: Math.random() * 2 - 1,
          y: Math.random() * 2 - 1,
        },
      )),
    dead_econs: [],
    avgValue: 0,
    deprecationFactor: 1,
    highscore: 0,
  });
}

export function random_pos(): Vec2 {
  while(true) {
    const pos =  {
      x: Math.random() * 1024 - 512,
      y: Math.random() * 1024 - 512,
    };
    if (length(pos) < 512){
      return pos;
    }
  }
}

function n_random_pos_no_collisions(n: number, entity_min_distance: number): Vec2[] {
  let result: Vec2[] = [];
  while (result.length < n) {
    const pos = random_pos();
    if(result.every(oldPos => length(sub(oldPos, pos)) > entity_min_distance)) {
      result.push(pos);
    }
  }
  return result;
}

export function tick(state: State) {
  for (const i in state.econs) {
    const econ = state.econs[i];
    econ.bubble_value = state.deprecationFactor*econ.bubble_value_raw;

    if (length(econ.pos) > 512) {
      econ.velocity = rebound(econ.velocity, minus(econ.pos));
    }

    for (const j in state.econs) {
      const other = state.econs[j];

      if (i === j) continue;

      // if (length(sub(econ.pos, other.pos)) < 64) {
      //   econ.velocity = {x: 0, y: 0};
      // }

      if (i >= j) continue; // below is only once per pair

      if (length(sub(econ.pos, other.pos)) < params.econ_min_distance) {
        const tmp = econ.velocity;
        econ.velocity = other.velocity;
        other.velocity = tmp;

        trade(state, econ, other);
      }
    }

    for (const j in state.billboards) {
      const billboard = state.billboards[j];
      // Coordinate along an axis parallel to the billboard; the first leg is at 0, the second at 1
      const p_coordinate = scalarProduct(sub(econ.pos, billboard[0]), sub(billboard[1], billboard[0])) / Math.pow(dist(billboard[1], billboard[0]), 2);
      // An axis normal to the billboard
      const n = normalize({ x: billboard[1].y - billboard[0].y, y: -billboard[1].x + billboard[0].x });
      const distance = Math.min( // Assembling a shape around the billboard out of the union of
        (p_coordinate >= 0 && p_coordinate <= 1) ? Math.abs(scalarProduct(n, sub(econ.pos, billboard[0]))) : Infinity, // a rectangle of width k around the billboard line
        dist(econ.pos, billboard[0]), // A circle of radius k around the first and second legs
        dist(econ.pos, billboard[1])
      );
      //console.warn(`Billboard distance: p_coord=${p_coordinate}, n_coord=${scalarProduct(n, sub(econ.pos, billboard[0]))}, distance 1 = ${dist(econ.pos, billboard[0])}, 2 = ${dist(econ.pos, billboard[1])}`);

      if(distance < params.billboard_influence_radius) {
        econ.bubble_value_raw += params.billboard_influence_strength;
      }
      if (distance < params.econ_min_distance) {
        if(scalarProduct(n, sub(econ.pos, billboard[0])) > 0) {
          econ.velocity = rebound(econ.velocity, n);
        } else {
          econ.velocity = rebound(econ.velocity, minus(n));
        }
      }
    }

    for (const j in state.food) {
      const food = state.food[j];

      if (length(sub(econ.pos, food)) < params.econ_food_collection_radius) {
        econ.food += params.food_value;

        state.food.splice(Number(j), 1);

        break;
      }
    }

    for (const j in state.bubbles) {
      const bubble = state.bubbles[j];

      if (length(sub(econ.pos, bubble)) < params.econ_bubble_collection_radius) {

        if (econ.food > econ.bubble_value * state.deprecationFactor) {
          econ.bubbles += 1;
          econ.food -= econ.bubble_value * state.deprecationFactor;
          state.player.food += state.avgValue;
          state.bubbles.splice(Number(j), 1);
        }

        break;
      }
    }

    if (length(econ.pos) < params.market_trade_radius) {
      trade_with_player(state, econ);
    }

    econ.pos.x += econ.velocity.x;
    econ.pos.y += econ.velocity.y;

    if (Math.random() < params.econ_velocity_change_chance) {
      econ.velocity = {
        x: Math.random() * 2 - 1,
        y: Math.random() * 2 - 1,
      };
    }
  }

  state.econs.forEach(e => { e.food -= params.econ_food_consumption; })

  let alive_econs: Econ[] = [];
  state.econs.forEach(e => {
    if(e.food > 0) alive_econs.push(e);
    else state.dead_econs.push(e);
  });
  state.econs = alive_econs;

  if (Math.random() < params.food_spawn_chance) {
    state.food.push(random_pos());
  }

  state.avgValue = computed(
    () => state.econs
      .map(e => e.bubble_value)
      .reduce((a, b) => a + b, 0)
      / state.econs.length,
  ).value;

  const total_bubbles_picked_up = computed(() => state.econs.map(e => e.bubbles).reduce((sum, bubbles) => sum + bubbles, 0)).value;
  state.deprecationFactor = 1 - (total_bubbles_picked_up / params.player_initial_bubbles);
}

function trade_with_player(state: State, a: Econ) {
  let seller: Trader;
  let buyer: Trader;
  let price: number;
  let amount: number;
  if(a.bubbles < a.bubble_value) {
    // a wants to buy
    seller = state.player;
    buyer = a;
    price = state.player.selling_price;
    if(a.bubble_value >= price) {
      amount = Math.min(
        Math.floor(a.food / state.player.selling_price),
        Math.ceil(a.bubble_value) - a.bubbles
      );
    } else {
      return;
    }
  } else if (a.bubbles > a.bubble_value) {
    // a wants to sell
    seller = a;
    buyer = state.player;
    price = a.bubble_value;
    if(price <= state.player.buying_price) {
      amount = Math.min(
        state.player.bubbles,
        Math.floor(a.bubbles - a.bubble_value)
      )
    } else {
      return;
    }
  } else {
    return;
  }

  seller.food += amount * price;
  buyer.food -= amount * price;
  seller.bubbles -= amount;
  buyer.bubbles += amount;

  if(seller === state.player) {
    console.log(`You sold ${amount} bubbles for ${amount*price}!`)
  } else {
    console.log(`You bought ${amount} bubbles for ${amount*price}!`);
  }
}

function trade(state: State, a: Econ, b: Econ) {
  // when does a trade happen?
  // i guess when one has too many and one has too little
  // the idea for now is to also use the value as the amount the econ wants.
  // at that point an exchange rate needs to be determined.
  // sale only happens if the seller has a lower value than the buyer.
  // at that point we use the price of the seller.

  let buyer;
  let seller;

  if (a.bubbles > a.bubble_value && b.bubbles < b.bubble_value) {
    seller = a;
    buyer = b;
  } else if (b.bubbles > b.bubble_value && a.bubbles < a.bubble_value) {
    seller = b;
    buyer = a;
  } else {
    return;
  }

  if (buyer.food === 0) return;

  const price = seller.bubble_value;

  if (price > buyer.bubble_value) return;

  const amount = Math.min(
    Math.ceil(buyer.bubble_value) - buyer.bubbles,
    Math.floor(buyer.food / price),
    seller.bubbles - Math.ceil(seller.bubble_value),
  );
  console.log(`Trading amount ${amount}`);

  if (amount === 0) {
    return;
  }

  seller.bubbles -= amount;
  buyer.bubbles += amount;

  buyer.food -= amount * price;
  seller.food += amount * price;

  state.last_trade = {
    amount,
    price,
  };
  state.price_history.push(price);
}
