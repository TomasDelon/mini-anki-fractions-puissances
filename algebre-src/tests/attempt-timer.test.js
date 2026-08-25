import { describe, expect, test } from 'vitest';
import { createAttemptTimer } from '../src/trainer/attemptTimer.js';

describe('active attempt timer',()=>{
  test('counts only time while running',()=>{
    let now=1000;
    const timer=createAttemptTimer({now:()=>now});
    now=6000;
    expect(timer.elapsed()).toBe(5000);
    expect(timer.pause()).toBe(5000);
    now=56000;
    expect(timer.elapsed()).toBe(5000);
    timer.resume();
    now=59000;
    expect(timer.elapsed()).toBe(8000);
  });

  test('resumes from persisted active time without counting time spent away',()=>{
    let now=1_000_000;
    const first=createAttemptTimer({now:()=>now,elapsedMs:12000});
    now+=3000;
    const saved=first.pause();
    expect(saved).toBe(15000);

    now+=7*24*60*60*1000;
    const resumed=createAttemptTimer({now:()=>now,elapsedMs:saved});
    expect(resumed.elapsed()).toBe(15000);
    now+=2000;
    expect(resumed.elapsed()).toBe(17000);
  });

  test('reset starts a fresh exercise timer',()=>{
    let now=0;
    const timer=createAttemptTimer({now:()=>now,elapsedMs:9000});
    now=1000;
    expect(timer.elapsed()).toBe(10000);
    timer.reset();
    now=3500;
    expect(timer.elapsed()).toBe(2500);
    expect(timer.snapshot()).toEqual({elapsedMs:2500,running:true});
  });
});
