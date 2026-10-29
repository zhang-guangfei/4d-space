# Generative model and identifiable quantities

Let q=(x,y,z,w) have coordinates ±1. Join exactly the 32 pairs differing in one coordinate. For a simple XW rotation:

x'=x cos(theta)-w sin(theta), w'=x sin(theta)+w cos(theta), y'=y, z'=z.

A 4D perspective projection and a fixed 3D pinhole camera can be represented as

p3=s (x',y',z')/(d4-w'),
u=cx+f s r·(x',y',z') / (R(d4-w')-s c·(x',y',z')),
v=cy-f s ucam·(x',y',z') / (R(d4-w')-s c·(x',y',z')).

Here c is the camera direction from target to eye, r its right vector, ucam its up vector, R camera distance, f focal length in pixels, and s an explicitly chosen projection scale. Normalize the denominator to obtain 1-b w'-a c·xyz', with a=s/(R d4), b=1/d4 and numerator magnitude F=f a. Fit a,b,F, camera orientation, principal point, phase, and angular rate instead of bounded, correlated R/f/s values.

## Gauge freedoms and limitations
- Absolute physical size cannot be recovered from this animation. Choosing halfside=1 fixes that gauge.
- Projection scale s and 3D camera distance R are only a ratio until a projection convention is chosen. Choosing s=d4 or s=d4-1 is valid, but produces different numeric R for the same image. This is not evidence of different underlying geometry.
- A general 3x5 projective matrix mixes optical-center offsets and initial XW phase into numerator w coefficients. Raw denominator w coefficient is not directly d4 until these gauges are fixed.
- At a nesting phase, the two w-fixed cubes are concentric in projected 3D. Their corresponding vertex rays intersect at the image of the 3D origin, furnishing a principal-point/phase constraint.
- Once axis conventions, phase and principal point are fixed, the constrained model can identify b and hence d4 in halfside units, and f=F/a. Pose sign/permutations remain cube symmetry choices.
- The unlabeled edge graph repeats every quarter turn. Thus 48 frames at 70ms can represent 90 degrees per 3.36s, while a labeled vertex returns after 13.44s. Never equate the visual loop with a labeled full turn.
- A negative rotation parameter is only meaningful relative to a stated axis convention and known vertex correspondence. Image reversal is observable, the absolute coordinate naming is not.

## Rendering versus structural evidence
The blue rods are thick and specular. Bright highlight ridges are not necessarily projected edge centerlines. Occluded joints and surface outlines should not be treated as true vertices. A few pixels residual on a brightness mask can be a radius/highlight fitting artifact rather than a geometric error.

Build cylinders after projecting 4D vertices to 3D if their apparent widths support approximately common 3D radii. Applying 4D perspective independently to rod thickness would yield a different width profile. Test these two mechanisms separately from the centerline motion.

The previous physical fit placed f exactly on its lower bound (350px) while R=5.65 and d4≈3.006. This is a warning that the allowed range constrained the optimizer. It is not sufficient evidence for those exact original parameters. Broaden the feasible ranges or use the dimensionless parameterization above and validate on held-out junction trajectories.

## Recommended verification
Fit a subset of unoccluded vertex junctions with topology correspondence, validate other frames, then independently compare straight segment axes. Report projected-center residual in pixels separately from tube silhouette and full RGB error. Material/highlight RGB mismatch must not invalidate an otherwise correct inverse geometric inference, nor should correct timing alone establish geometric correctness.
