export type DialogueEvent =
  | 'game_start'
  | 'player_blackjack'
  | 'dealer_blackjack'
  | 'player_bust'
  | 'dealer_bust'
  | 'player_win'
  | 'player_loss'
  | 'push'
  | 'hit_17'
  | 'hit_18'
  | 'hit_19'
  | 'hit_20'
  | 'survived_risky_hit'
  | 'double_win'
  | 'double_loss'
  | 'split_started'
  | 'split_sweep'
  | 'split_disaster'
  | 'losing_streak'
  | 'winning_streak'
  | 'refill_chips'
  | 'idle'
  | 'return_player';

export type DialogueLineInput = string | readonly [text: string, weight: number];

export const DIALOGUE_BANK: Record<DialogueEvent, readonly DialogueLineInput[]> = {
  game_start: [
    ['Welcome to the table. Try not to make it weird.', 2],
    'Cards are honest. People get creative.',
    'Sit down. We are about to find out what kind of decision-maker you are.',
    'House is open. Judgment is optional.',
  ],
  player_blackjack: [
    ['BlackJak. That is how you introduce yourself.', 2],
    'Twenty-one. Clean. Annoyingly clean.',
    'Natural twenty-one. Do not get used to feeling this powerful.',
    'Okay. That one had style.',
  ],
  dealer_blackjack: [
    ['Business.', 2],
    'House opened the door and you walked directly into it.',
    'Dealer blackjack. Beautiful for me. Less so for you.',
    'That hand ended before your confidence loaded.',
  ],
  player_bust: [
    ['And there it is. Gravity.', 2],
    'Too much ambition. Not enough arithmetic.',
    'You flew directly past twenty-one.',
    'The cards said stop. You heard inspirational music instead.',
  ],
  dealer_bust: [
    ['Dealer broke. Enjoy this rare administrative failure.', 2],
    'House malfunction. Please exploit responsibly.',
    'I went over. Pretend you planned that.',
    'Sometimes the dealer also makes character-building decisions.',
  ],
  player_win: [
    ['Paid. Keep the celebration economically sized.', 2],
    'You got it. Calm down.',
    'Fine. That one belongs to you.',
    'Take the chips before I reconsider the atmosphere.',
  ],
  player_loss: [
    ['House appreciates the donation.', 2],
    'That hand has been archived under unfortunate.',
    'You did not win. Very important distinction.',
    'Maybe cards are not your ministry.',
  ],
  push: [
    ['Nobody learned anything.', 2],
    'Push. All that drama for accounting neutrality.',
    'Tie game. Emotionally expensive. Financially irrelevant.',
    'We return to where we started, but slightly more suspicious.',
  ],
  hit_17: [
    ['Hitting seventeen? Bold little experiment.', 2],
    'Seventeen was respectable. You wanted a plot twist.',
    'That is enough points for most people. You are apparently not most people.',
    'Seventeen and still asking for another card. Noted.',
  ],
  hit_18: [
    ['Eighteen. You had peace and rejected it.', 2],
    'Hitting eighteen is a personality test.',
    'You saw a solid hand and chose volatility.',
    'Eighteen was fine. Fine was not exciting enough, apparently.',
  ],
  hit_19: [
    ['Nineteen? You are negotiating with physics now.', 2],
    'That button was optional.',
    'Hitting nineteen is the kind of confidence that requires witnesses.',
    'Nineteen. One card away from a cautionary tale.',
  ],
  hit_20: [
    ['Oh, you are stupid stupid.', 2],
    'Twenty. And you hit. This table will remember you.',
    'You had twenty. You chose folklore.',
    'That is not strategy. That is performance art.',
  ],
  survived_risky_hit: [
    ['You lived. Do not confuse that with wisdom.', 2],
    'Risky hit survived. The lesson you learned may be the wrong one.',
    'Somehow that worked. Dangerous information.',
    'Congratulations on reinforcing questionable behavior.',
  ],
  double_win: [
    ['Now we are talking.', 2],
    'Double down, double paid. That is clean work.',
    'You pressed harder and the cards respected it.',
    'Confidence with a receipt.',
  ],
  double_loss: [
    ['Double the conviction. Same funeral.', 2],
    'You doubled down. The universe documented it.',
    'Twice the stake, premium disappointment.',
    'That decision came with upgraded consequences.',
  ],
  split_started: [
    ['Split personality. Let us make two problems.', 2],
    'One hand was not enough trouble?',
    'Two hands. Twice the opportunity to explain yourself.',
    'Split approved. Complexity has entered the room.',
  ],
  split_sweep: [
    ['Both hands paid. Disrespectful.', 2],
    'Sweep. You cleaned the table twice.',
    'Two hands, two wins. Very irritating efficiency.',
    'That split actually had a business plan.',
  ],
  split_disaster: [
    ['Two hands. Zero survivors.', 2],
    'You multiplied the problem successfully.',
    'Split disaster. We achieved loss redundancy.',
    'One bad hand became a small department.',
  ],
  losing_streak: [
    ['We have entered a pattern.', 2],
    'The losing streak is becoming structurally significant.',
    'At this point the cards know your schedule.',
    'Maybe change seats. It will not help, but it creates activity.',
  ],
  winning_streak: [
    ['Okay, hot hand. Keep your voice down.', 2],
    'You are stacking wins now. Suspicious behavior.',
    'Three-plus wins. The table has noticed.',
    'Momentum exists until it becomes confidence.',
  ],
  refill_chips: [
    ['Fresh practice chips. Financial resurrection complete.', 2],
    'Refilled. No lecture. We both know what happened.',
    'Back to baseline. Character development remains non-refundable.',
    'Practice stack restored. Try a new historical timeline.',
  ],
  idle: [
    ['Your move.', 2],
    'Cards are down. Make it interesting.',
    'Take your time. The deck is not going anywhere.',
    'House is listening.',
  ],
  return_player: [
    ['Back again. I respect the lack of closure.', 2],
    'You returned. The table kept your seat psychologically warm.',
    'Welcome back. Same cards. New opportunities for poor judgment.',
    'Round two, or twenty. I stopped counting emotionally.',
  ],
};
