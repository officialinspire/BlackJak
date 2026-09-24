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
  | 'deal_start'
  | 'player_stand'
  | 'return_player';

export type DialogueLineInput = string | readonly [text: string, weight: number];

/*
 * Jak's voice: a dealer who is also a cardist (fans, springs, Sybil cuts,
 * one-handed Charliers), talks like a First Amendment auditor filming the
 * table ("public forum", "I don't answer questions", "am I being detained?"),
 * and says "Hallelujah" when the chips come in. Weighted lines (…, 2) are his
 * signature takes for that moment. Keep every line short enough for the panel.
 */
export const DIALOGUE_BANK: Record<DialogueEvent, readonly DialogueLineInput[]> = {
  game_start: [
    ['Welcome to the table. This is a public forum and I am filming.', 2],
    'Sit down. Cards are honest. People get creative.',
    'Hands where I can see them. Mine are busy doing a Sybil cut.',
    'House is open. I know my rights. Do you know yours?',
    'Hallelujah, a new player. Let me warm up the fan.',
  ],
  deal_start: [
    ['Riffle, bridge, deal. Watch the hands, not the chips.', 2],
    'One-handed Charlier, then cards. Style is free.',
    'Spring the deck. Catch the attitude.',
    'Sybil cut says you get two cards. Sybil does not lie.',
    'Dealing on camera. For educational purposes.',
    'Fan it, close it, deal it. Cardistry is just math with drip.',
  ],
  player_blackjack: [
    ['HALLELUJAH. BlackJak. That is how you introduce yourself.', 2],
    'Twenty-one off the top. Somebody say amen.',
    'Natural. Clean as a fresh pressure fan.',
    'Okay. That one had style. I am putting it in the highlight reel.',
  ],
  dealer_blackjack: [
    ['Business.', 2],
    'Dealer blackjack. I do not answer questions about it.',
    'Ace-high flourish. Your stake has been lawfully detained.',
    'That hand ended before your confidence finished loading.',
  ],
  player_bust: [
    ['And there it is. Gravity.', 2],
    'Too much ambition. Not enough arithmetic.',
    'You flew past twenty-one like it was a no-filming sign.',
    'The cards said stop. You heard a worship choir instead.',
  ],
  dealer_bust: [
    ['I went over. I do not consent to this outcome.', 2],
    'Dealer bust. I would like to speak to my own supervisor.',
    'Hallelujah for you, I guess. Enjoy the administrative failure.',
    'Even my Charlier could not save that one.',
  ],
  player_win: [
    ['Hallelujah, you got paid. Keep it economically sized.', 2],
    'Paid. That was a lawful win. I checked the footage.',
    'Fine. That one belongs to you. Chips released.',
    'Take the chips before I reconsider the atmosphere.',
  ],
  player_loss: [
    ['House appreciates the donation. Receipt is on camera.', 2],
    'That hand has been archived under unfortunate.',
    'You are not being detained. Your chips are, though.',
    'Maybe cards are not your ministry.',
  ],
  push: [
    ['Push. Nobody learned anything.', 2],
    'Tie game. All that drama for accounting neutrality.',
    'Push. I will be filing a public records request on that hand.',
    'We return to where we started, slightly more suspicious.',
  ],
  hit_17: [
    ['Hitting seventeen? Am I being detained, or are you just brave?', 2],
    'Seventeen was respectable. You wanted a plot twist.',
    'That is enough points for most people. You are not most people.',
    'Seventeen and asking for more. Noted for the record.',
  ],
  hit_18: [
    ['Eighteen. You had peace and rejected it.', 2],
    'Hitting eighteen is a personality test. I am recording it.',
    'You saw a solid hand and chose volatility.',
    'Eighteen was fine. Fine was not content enough, apparently.',
  ],
  hit_19: [
    ['Nineteen? You are negotiating with physics now.', 2],
    'That button was optional. Like identifying yourself.',
    'Hitting nineteen is the kind of confidence that needs witnesses.',
    'Nineteen. One card away from a cautionary tale.',
  ],
  hit_20: [
    ['Oh, you are stupid stupid.', 2],
    'Twenty. And you hit. This table will remember you.',
    'You had twenty. Somebody get this on camera.',
    'That is not strategy. That is performance art.',
  ],
  survived_risky_hit: [
    ['You lived. Hallelujah. Do not confuse that with wisdom.', 2],
    'Risky hit survived. The lesson you learned may be the wrong one.',
    'Somehow that worked. Dangerous information.',
    'Congratulations on reinforcing questionable behavior.',
  ],
  double_win: [
    ['Double down, double paid. HALLELUJAH.', 2],
    'Now we are talking. Confidence with a receipt.',
    'You pressed harder and the cards respected it.',
    'Double clean. Like a perfect two-handed spring.',
  ],
  double_loss: [
    ['Double the conviction. Same funeral.', 2],
    'You doubled down. The footage will outlive us all.',
    'Twice the stake, premium disappointment.',
    'That decision came with upgraded consequences.',
  ],
  split_started: [
    ['Split them like a Sybil cut. Two packets, two problems.', 2],
    'One hand was not enough trouble?',
    'Two hands. Twice the opportunity to explain yourself on camera.',
    'Split approved. Complexity has entered the public forum.',
  ],
  split_sweep: [
    ['Both hands paid. Hallelujah, and also: disrespectful.', 2],
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
    ['We have entered a pattern. I am documenting it.', 2],
    'The losing streak is becoming structurally significant.',
    'At this point the cards know your schedule.',
    'Maybe change seats. It will not help, but it creates footage.',
  ],
  winning_streak: [
    ['Okay, hot hand. Keep your voice down. Hallelujah, quietly.', 2],
    'You are stacking wins now. Suspicious behavior.',
    'Three-plus wins. Somebody call a supervisor.',
    'Momentum exists until it becomes confidence.',
  ],
  refill_chips: [
    ['Fresh practice chips. Hallelujah, resurrection complete.', 2],
    'Refilled. No lecture. We both know what happened.',
    'Back to baseline. Character development remains non-refundable.',
    'Practice stack restored. Try a new historical timeline.',
  ],
  idle: [
    ['Your move.', 2],
    'Cards are down. Make it interesting.',
    'Take your time. I am practicing a Charlier.',
    'House is listening. And recording.',
    'I do not answer questions. I do answer Hit or Stand.',
  ],
  player_stand: [
    ['Standing. Invoking your right to remain seated.', 2],
    'Stand noted. Let me see what the house has.',
    'You stand. I flip. Watch the thumb, not the card.',
    'Locking it in. Hallelujah for restraint.',
  ],
  return_player: [
    ['Back again. Hallelujah. I respect the lack of closure.', 2],
    'You returned. The table kept your seat psychologically warm.',
    'Welcome back. Same cards, new fan, new poor judgment.',
    'Round two, or twenty. The camera never stopped rolling.',
  ],
};
