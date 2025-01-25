import { reactive } from "vue";

export function dbg<T>(t: T): T {
  console.log(t);
  return t;
}

export type Vec2 = {
  x: number,
  y: number,
};

export type Econ = {
  pos: Vec2,
  velocity: Vec2,

  food: number;
  bubbles: number;

  bubble_value: number;
};

export function econ(pos: Vec2, velocity: Vec2): Econ {
  return {
    pos,
    velocity,
    food: params.econ_initial_food,
    bubbles: 0,
    bubble_value: 0,
  };
}

export type Player = {
  bubbles: number,
  marketing_points: number,
};

export const params = reactive({
  food_spawn_chance: 0.01,
  player_initial_bubbles: 256,
  econ_initial_food: 20,
  econ_min_distance: 32,
  econ_velocity_change_chance: 0.01,
  econ_bubble_collection_radius: 32,
  econ_food_collection_radius: 64,
  food_value: 12,
  billboard_influence_radius: 128,
  billboard_influence_strength: 0.1,
  billboard_price: 20,
  influencer_price: 50,
  marketinng_point_increment: 20,
});

export type State = {
  player: Player,
  econs: Econ[],
  billboards: Vec2[],
  food: Vec2[],
  bubbles: Vec2[],
  last_trade: { amount: number, price: number } | null,
  price_history: number[],
};

export function init(): State {
  return reactive({
    player: {
      bubbles: params.player_initial_bubbles,
      marketing_points: 0,
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
  });
}

function random_pos(): Vec2 {
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

function sub(a: Vec2, b: Vec2): Vec2 {
  return {
    x: a.x - b.x,
    y: a.y - b.y,
  };
}

function length(vec: Vec2): number {
  const x = Math.abs(vec.x);
  const y = Math.abs(vec.y);
  return Math.abs(Math.sqrt(x * x + y * y));
} 

function scalarProduct(v1: Vec2, v2: Vec2): number {
  return v1.x * v2.x + v1.y * v2.y;
}

export function tick(state: State) {
  for (const i in state.econs) {
    const econ = state.econs[i];


    if (length(econ.pos) > 512) {
      econ.velocity.x = -econ.velocity.x;
      econ.velocity.y = -econ.velocity.y;
    }

    for (const j in state.econs) {
      const other = state.econs[j];

      if (i === j) continue;

      const tmp = econ.velocity;
      econ.velocity = other.velocity;
      other.velocity = tmp;

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
      econ.bubble_value += params.billboard_influence_strength;
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
        econ.bubbles += 1;

        state.bubbles.splice(Number(j), 1);

        break;
      }
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

  if (Math.random() < params.food_spawn_chance) {
    state.food.push(random_pos());
  }
}

function trade(state: State, a: Econ, b: Econ) {
  // when does a trade happen?
  // i guess when one has too many and one has too little
  // the idea for now is to also use the value as the amount the econ wants.
  // at that point an exchange rate needs to be determined.
  // sale only happens if the seller has a lower value than the buyer.
  // at that point we use the price of the seller.

  let seller;

  console.log(`${a} trades with ${b}`);  let buyer;

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
