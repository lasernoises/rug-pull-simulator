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
};

export type Player = {
  bubbles: number,
  marketing_points: number,
};

export type State = {
  econs: Econ[];
  player: Player;
};

export function init(): State {
  return reactive({
    econs: 
      [...Array(Math.round(Math.random() * 32)).keys()].map(() => ({
        pos: {
          x: Math.random() * 1024 - 512,
          y: Math.random() * 1024 - 512,
        },
        velocity: {
          x: Math.random() * 2 - 1,
          y: Math.random() * 2 - 1,
        },
        food: 2,
        bubbles: 0,
      })).filter(e => length(e.pos) < 512),

      // [
      //   {
      //     pos: {
      //       x: -256,
      //       y: -256,
      //     },
      //     velocity: {
      //       x: 1,
      //       y: 1,
      //     },
      //     food: 2,
      //     bubbles: 0,
      //   },
      //   {
      //     pos: {
      //       x: 256,
      //       y: 256,
      //     },
      //     velocity: {
      //       x: -1,
      //       y: -1,
      //     },
      //     food: 2,
      //     bubbles: 0,
      //   }
      // ],
    player: {
      bubbles: 2048,
      marketing_points: 0,
    },
  });
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

export function tick(state: State) {
  for (const i in state.econs) {
    const econ = state.econs[i];


    if (length(econ.pos) > 512) {
      econ.velocity.x = -econ.velocity.x;
      econ.velocity.y = -econ.velocity.y;
    }

    for (const j in state.econs) {
      if (i === j) continue;

      const other = state.econs[j];

      // if (length(sub(econ.pos, other.pos)) < 64) {
      //   econ.velocity = {x: 0, y: 0};
      // }

      if (i >= j) continue; // below is only once per pair

      if (length(sub(econ.pos, other.pos)) < 32) {
        const tmp = econ.velocity;
        econ.velocity = other.velocity;
        other.velocity = tmp;
      }
    }

    econ.pos.x += econ.velocity.x;
    econ.pos.y += econ.velocity.y;
  }
}

export function availableMarketingDevices(player: Player) {
  return {
    billboard: player.marketing_points >= 20,
    influencer: player.marketing_points >= 50,
  };
}
