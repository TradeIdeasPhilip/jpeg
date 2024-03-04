# JPEG without Discrete Cosine Transform

I'm exploring some ideas about data compression.

The JPEG compression algorithm inspired this project.
There's one step in particular I'd like to change in JPEG.
_After_ splitting the colors into separate channels and _before_ quantizing the results, the algorithm _transforms_ the data.
It breaks the data into squares of 64 pixels each, then uses a Discrete Cosine Transform on each of groups.
The result is still a list a 64 numbers.
The idea is that the new list will be easier to quantize and compress.
DCT gives you a good guess at which numbers are most and least important, which in important in _lossy_ compression, a.k.a quantizing.
After quantizing, the data will go to an entropy encoder for lossless compression.
If a transform makes the quantized data more predictable, then the entropy encoder will do a good job.

My hypothesis is that there is nothing special about the DCT in this algorithm.
In some cases DCT can be very helpful.
But is DCT relevant to the JPEG algorithm?
It seems like a lot of other transforms will do the job, and some might work better than DCT.

I'm focused on linear transforms.
These are easy to specify and apply.
And they are powerful.
And, if I see promising results, this will be a perfect opportunity for the computer to tune things further on it's own.
The AI doesn't have to write code, just tune a matrix.

## TODO
I need better input data.
The way I'm currently doing it, one pixel at a time, is great for unit testing, but it's getting tedious.
I need to load and process real image files.
And I need an optional preprocessing step to see how that affects things.

I will focus on the black and white data for now.

## TODO
I need to look at the quantization.
Right now I'm storing each number in a `double`, so I lose very little to round off error.
The whole point of quantization is to use a lot fewer bits — to push our precision _beyond_ its limits — while minimizing the damage.

I need to see how much damage quantization will do.
That's the only way to see if this project makes sense at all.
It's very possible that the transformed data will cost _more_ bits than the original data just to get decent quality.
It's also very possible that I'll see good results from the start.
I won't know until I add this step and look at the results.

## What I got so far
I have a nice framework for doing and reversing the transform step.
And I have some low level tools for inspecting that step.

The idea is straight from a linear algebra text book, but it's good to see it actually working.

