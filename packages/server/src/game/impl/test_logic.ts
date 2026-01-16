import { SplitStealGame } from './SplitStealGame';
import { Player } from '@ryunix/shared';

const testPlayers: Player[] = [
    { id: 'p1', name: 'Player 1', isHost: true, isAlive: true, score: 0, roomWins: 0, socketId: 's1' },
    { id: 'p2', name: 'Player 2', isHost: false, isAlive: true, score: 0, roomWins: 0, socketId: 's2' }
];

const threePlayers: Player[] = [
    { id: 'p1', name: 'Player 1', isHost: true, isAlive: true, score: 0, roomWins: 0, socketId: 's1' },
    { id: 'p2', name: 'Player 2', isHost: false, isAlive: true, score: 0, roomWins: 0, socketId: 's2' },
    { id: 'p3', name: 'Player 3', isHost: false, isAlive: true, score: 0, roomWins: 0, socketId: 's3' }
];


async function runTest() {
    const game = new SplitStealGame();
    console.log('--- TEST 1: P1 Steal, P2 Split (P1 Wins) ---');
    let state = game.setup(testPlayers);

    // Round 1
    // Pairing should be [p1, p2]
    console.log('Pairings R1:', state.pairings);

    // P1 Steals, P2 Splits
    state = game.handleAction(state, 'p1', { type: 'decision', value: 'steal' })!;
    state = game.handleAction(state, 'p2', { type: 'decision', value: 'split' })!;

    console.log('Trust Points R1:', state.trustPoints);
    // Expect P1: 3+2=5, P2: 3-2=1

    // Round 2
    state = game.handleAction(state, 'p1', { type: 'decision', value: 'split' })!;
    state = game.handleAction(state, 'p2', { type: 'decision', value: 'split' })!;
    console.log('Trust Points R2:', state.trustPoints);
    // Expect P1: 6, P2: 2

    // Round 3
    state = game.handleAction(state, 'p1', { type: 'decision', value: 'split' })!;
    state = game.handleAction(state, 'p2', { type: 'decision', value: 'split' })!;

    // Round 4
    state = game.handleAction(state, 'p1', { type: 'decision', value: 'split' })!;
    state = game.handleAction(state, 'p2', { type: 'decision', value: 'split' })!;

    console.log('Final Round:', state.round);
    console.log('Completed:', game.isComplete(state));
    console.log('Final Trust:', state.trustPoints);

    const results = game.resolve(state, testPlayers);
    console.log('Results:', results);

    if (results['p1'] === 100 && results['p2'] === -50) {
        console.log('PASS: P1 Won, P2 Lost');
    } else {
        console.log('FAIL: Scores incorrect');
    }

    console.log('\n--- TEST 2: Tie Game (Both Split) ---');
    state = game.setup(testPlayers);
    for (let i = 0; i < 4; i++) {
        state = game.handleAction(state, 'p1', { type: 'decision', value: 'split' })!;
        state = game.handleAction(state, 'p2', { type: 'decision', value: 'split' })!;
    }
    const results2 = game.resolve(state, testPlayers);
    console.log('Final Trust:', state.trustPoints);
    console.log('Results:', results2);
    // Expect both 100
    if (results2['p1'] === 100 && results2['p2'] === 100) {
        console.log('PASS: Tie Game');
    } else {
        console.log('FAIL: Scores incorrect for tie');
    }
}

runTest();
