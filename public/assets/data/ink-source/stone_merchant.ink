EXTERNAL hasItem(itemId)
EXTERNAL hasFlag(flagName)
EXTERNAL setFlag(flagName)
EXTERNAL addItem(itemId)
EXTERNAL removeItem(itemId)
EXTERNAL visitedRoom(roomId)
EXTERNAL getDeathCount()

=== greeting ===
{hasFlag("met_stone_merchant"):
    {getDeathCount() > 3:
        The merchant's stone lips crack into a grin. You're... still... alive? Impressive. Most... customers... don't come... back. #speaker:Stone Merchant #emotion:amused
        -> menu
    - else:
        Ah... you... again... #speaker:Stone Merchant #emotion:friendly
        Each word takes considerable effort, stone grinding against stone.
        -> menu
    }
- else:
    A half-petrified man stands behind a market stall. His right arm is solid stone, but his left waves enthusiastically. #speaker:Stone Merchant #emotion:friendly
    Welcome... to... my... shop! #speaker:Stone Merchant #emotion:enthusiastic
    The words come slowly, each syllable a small victory against encroaching stone.
    Can't... feel... my... right... side... but... sales... must... go... on!
    ~ setFlag("met_stone_merchant")
    -> menu
}

=== menu ===
+ [Ask about the curse] -> curse_talk
+ [Ask what he sells] -> shop_talk
+ {hasFlag("knows_about_curse")} [Ask about the crystal shards] -> crystal_talk
+ {hasItem("cave-crystal-shard")} [Show the crystal shard] -> show_crystal
+ [Leave] -> farewell

=== curse_talk ===
The merchant's mobile eye rolls expressively. #speaker:Stone Merchant #emotion:serious
The curse? Started... three... months... ago.
First... it was... just... the trees. Then... the buildings.
Then... he gestures at his stone right arm... me.
It's spreading... from... the edges... inward. Toward... the castle.
The king... choked... on an olive. No heir. No one... to stop... it.
Some say... there's a cure... deep... in the caverns.
But who'd... be foolish... enough... to go... looking?
He eyes you meaningfully.
-> menu

=== shop_talk ===
The merchant gestures at his stall with his one mobile arm. #speaker:Stone Merchant #emotion:enthusiastic
I sell... everything! Well... I SOLD... everything.
Now... I sell... mostly... dust... and... regret.
He tries to lift a petrified apple from the display.
This... used to... be... a Honeycrisp. Now... it's... a Stonecrisp.
Not... my... best... seller.
My business... plan... didn't... account... for... magical... petrification.
A pause.
Who... plans... for... that?
-> menu

=== crystal_talk ===
The merchant's eye lights up with interest. #speaker:Stone Merchant #emotion:excited
Crystal... shards? You know... about... those?
The caves... are full... of them. Little... bits... of... old... magic.
The castle... guards... they look... for... people... carrying... them.
It's... proof... you've... been... to the deep... places.
Proof... you might... be... important. Or... stupid. Same... thing... really.
If you... find... one... take it... to the castle. Maybe... THEY... can fix... this.
He gestures at his stone arm.
-> menu

=== show_crystal ===
The merchant's one mobile eye goes wide. #speaker:Stone Merchant #emotion:surprised
You... FOUND... one! A real... crystal... shard!
I can... FEEL... it. Warm. Like... sunlight... used... to be.
Take... it... to the castle... guards. Show... them.
They'll... know... what... it means. It means... hope.
His stone arm seems to glow faintly near the crystal.
Or... I'm... hallucinating. The petrification... does... things... to your... mind.
Either... way... GO. Before... this... whole... kingdom... is... a... sculpture... garden.
-> menu

=== farewell ===
Come... again! The merchant waves with his one good arm. #speaker:Stone Merchant #emotion:friendly
I'll... be... here. I'm... not... going... anywhere.
He glances down at his stone legs.
...Literally.
-> END
