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

I need to make sure I'm not giving more bits to the quantizer than it needs.

### Starting Point

For simplicity, start with the identity transform.
All pixels are treated the same and are all grouped together.

**Assumption**:
When I look at all of the pixel values in the entire image, I expect some values to be much more common than other values.
I.e. if I pass the list of pixel values to an entropy encoder, I'd expect to see appreciable compression.
One transform will be considered _better_ than another if the resulting values would compress better.

I am designing and optimizing this algorithm for the case when this is true.
However, the algorithm should still give _decent_ results when the data is not compressible.
(E.g. All values are equally common or almost equal, or some value _are_ more common but storing a dictionary would be impractical.)
And the algorithm should degrade gracefully when the data is okay but not great.

Note my concern about the size of the dictionary.
A _good_ transform will spit out data that is easy to put in a dictionary.

**Case 1**:
Every value is (approximately) just as common as every other value.

I can still use quantization to get lossy compression.
I can use N values instead of 256.
(Lower N = Smaller file and worse quality.)
And the entropy encoder is useful when N is not an exact power of 2.

**Case 2**:
Values do _not_ span then entire possible range from 0 to 255.
Values between 30 and 200 each appear approximately as often as each other and the remaining values never appear.

First I check if quantization is required.
Maybe the compression settings say to use only 200 unique values, when this case actually needs only 171.

Then I create a _simple_ dictionary telling the entropy encoder the probabilities of each value.
In this case: "Values between 30 and 200 each appear approximately as often as each other and the remaining values never appear."

**Case 3**:
When I plot a histogram of how how often each value appears, I get a bell curve.
This is an idealized case of what I'm optimizing for.

First consider the case where quantization is not required.
The main program allows this step to save all 256 possible values.
The entropy encoder will compress this well.
The taller and thinner the bell curve, the better the compression.

Now, what if the main program only allows 128 possible values?
I could just divide each value by 2.
But I could do better if I allocated more values near the peak of the bell curve and fewer values near the edges.
I never want to allocate more values than required in the middle.
Hopefully the _same_ dictionary can describe the frequency of each value _and_ how these values are spread out.

**Case 4**:

The histogram might include a few spikes spread out over over the values.
This would be common if someone draws on top of an image with a solid color.
E.g. text and arrows.

This might deserve special attention.
This is an important test case.

**Case 5**:

The histogram might include several different bell curves added together along with some random noise.
This seems very common, as a photograph will have different areas. It will have dark areas, and light areas. None of these are a single color, but a set of similar colors.

This is what I expect from most photographs.
Some colors will be much more common than others.
The common colors will clump in groups next to each other.
I will have to make arbitrary cutoffs because these groups won't be perfect or have clean edges.

## TODO

I need an algorithm for objectively measuring the error of each compressed and decompressed file.

Eventually I will need more than one measure.
As discussed above, we will have different needs at different times.
For now I need something simple so I can start measuring the things I'm testing.

A very simple measure would compare each pixel in the final image to the same pixel in the original image.
Root - mean - square to get a total error.

This next algorithm is a little more forgiving.
We know this is lossy compression and we know that there will be round off errors even if the quality is set to the maximum.
So we need to prioritize _something_ to test this whole idea.
I want to allow some deviations in the low frequency parts and prioritize the smaller details.
If you take a picture of a document, and some parts are in shadow, your brain can filter that out.
This algorithm cares more about the relative values of nearby pixels, rather than the actual values of the pixels.
It limits the drift, too, so it never gets that far off.

- Compare _each_ pixel to _each_ of its 8 neighbors.

  - Start by comparing each pixel in the final image to it's neighbor in the final image. (i.e. Compute the first derivative or the first difference.)
  - Then do the same thing to the corresponding pixels in the original image.
  - Then, for each of the 8 directions, compare the values we computed in the previous two bullet points.
  - A lot of these differences will be negative, so square the values at this step.
  - Compute the total over all pixels and all 8 directions, and take the square root of the total.
  - Divide the error by the total number of pixels so we can compare the results of different images.

- There are some special cases
  - What happens at the top and left of the image, when there is no adjacent pixel?
  - What happens at the bottom and the right of each cell when the decoder does not have access to the next pixel?
  - In both cases we use the same simple rule.
  - We look at the pixel in the middle and ignore the missing neighbor.
  - We compare the pixel in the final image directly to the same pixel in the original image.
  - That value might get repeated if this pixel is a corner piece.
  - This keeps our estimates from drifting too far from reality.
  - Initially these special cases have the same weight as the errors from the previous section.
  - However, we can adjust those weights to care more or less about long term drift.

There are no limits to what an error function can do.
We are already set up to transform cells of an image.
For example, we could do a DCT on the initial image and the final image before comparing them.
Then this error function could give higher weights to the errors in the low frequency items.
This is the data that standard JPEG thinks is the most important.
We could cover a lot with this framework, just using different transformation matrices and weights.

I'm rethinking my initial algorithm.

- We don't need access to the nearby blocks.
- We can get the same general results with just a single transformation matrix.
- Each pixel in the transformed matrix is the sum of the pixel just to the right, the pixel one down, and the pixel one down and one right minus 3 times the pixel itself.
- In the bottom right corner we just use the value itself.
- On the right edge above the bottom:???❓ Ideally a mix of the corner and middle cases.
- ⁇ On the right edge include twice the value of the main pixel - the value of the pixel below it. Check that the signs are consistent between this and the other rules.
- We would not be able to square the individual error components with as much detail as in the original algorithm.
- So some positive errors could be masked by some negative errors.
- Is that a problem?
- Or maybe our standard algorithm should have the option to square or abs() each value before applying weights.
- Do we need to worry about how to weight the corner vs the edges vs interior?

## What I got so far

I have a nice framework for doing and reversing the transform step.
And I have some low level tools for inspecting that step.

The idea is straight from a linear algebra text book, but it's good to see it actually working.
