/**
 * useLiveSession.test.js — Tests for useLiveSession hook
 */
import React from 'react';
import { renderHook, act } from '@testing-library/react';

// Mock @stomp/stompjs
const mockSubscribe = jest.fn();
const mockPublish = jest.fn();
const mockActivate = jest.fn();
const mockDeactivate = jest.fn();

let connectCallback;
let disconnectCallback;
let errorCallback;
let mockConnected = true;

jest.mock('@stomp/stompjs', () => {
  return {
    Client: function(config) {
      connectCallback = config.onConnect;
      disconnectCallback = config.onDisconnect;
      errorCallback = config.onStompError;
      this.activate = mockActivate;
      this.deactivate = mockDeactivate;
      this.subscribe = mockSubscribe;
      this.publish = mockPublish;
      Object.defineProperty(this, 'connected', { get: () => mockConnected });
    },
  };
});

jest.mock('sockjs-client', () => jest.fn());

// Import after mocks
const { useLiveSession } = require('./useLiveSession');

describe('useLiveSession', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSubscribe.mockReturnValue({ unsubscribe: jest.fn() });
  });

  test('does not connect when sessionId is null', () => {
    renderHook(() => useLiveSession(null));
    expect(mockActivate).not.toHaveBeenCalled();
  });

  test('does not connect when sessionId is undefined', () => {
    renderHook(() => useLiveSession(undefined));
    expect(mockActivate).not.toHaveBeenCalled();
  });

  test('connects when sessionId is provided', () => {
    renderHook(() => useLiveSession(123));
    expect(mockActivate).toHaveBeenCalledTimes(1);
  });

  test('subscribes to events, question, and question-result topics on connect', () => {
    renderHook(() => useLiveSession(42));
    act(() => { connectCallback(); });
    expect(mockSubscribe).toHaveBeenCalledTimes(3);
    expect(mockSubscribe).toHaveBeenCalledWith('/topic/session/42/events', expect.any(Function));
    expect(mockSubscribe).toHaveBeenCalledWith('/topic/session/42/question', expect.any(Function));
    expect(mockSubscribe).toHaveBeenCalledWith('/topic/session/42/question-result', expect.any(Function));
  });

  test('calls onEvent handler when event message is received', () => {
    const onEvent = jest.fn();
    renderHook(() => useLiveSession(1, { onEvent }));
    act(() => { connectCallback(); });
    const callback = mockSubscribe.mock.calls[0][1];
    callback({ body: JSON.stringify({ type: 'STARTED' }) });
    expect(onEvent).toHaveBeenCalledWith({ type: 'STARTED' });
  });

  test('calls onQuestion handler when question message is received', () => {
    const onQuestion = jest.fn();
    renderHook(() => useLiveSession(1, { onQuestion }));
    act(() => { connectCallback(); });
    const callback = mockSubscribe.mock.calls[1][1];
    callback({ body: JSON.stringify({ id: 5, text: 'Q?' }) });
    expect(onQuestion).toHaveBeenCalledWith({ id: 5, text: 'Q?' });
  });

  test('calls onQuestionResult handler when result message is received', () => {
    const onQuestionResult = jest.fn();
    renderHook(() => useLiveSession(1, { onQuestionResult }));
    act(() => { connectCallback(); });
    const callback = mockSubscribe.mock.calls[2][1];
    callback({ body: JSON.stringify({ correct: true }) });
    expect(onQuestionResult).toHaveBeenCalledWith({ correct: true });
  });

  test('handles JSON parse error gracefully for events', () => {
    const onEvent = jest.fn();
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    renderHook(() => useLiveSession(1, { onEvent }));
    act(() => { connectCallback(); });
    const callback = mockSubscribe.mock.calls[0][1];
    callback({ body: 'invalid json' });
    expect(onEvent).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  test('handles JSON parse error gracefully for question', () => {
    const onQuestion = jest.fn();
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    renderHook(() => useLiveSession(1, { onQuestion }));
    act(() => { connectCallback(); });
    const callback = mockSubscribe.mock.calls[1][1];
    callback({ body: 'bad{' });
    expect(onQuestion).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  test('deactivates client on unmount', () => {
    const { unmount } = renderHook(() => useLiveSession(10));
    unmount();
    expect(mockDeactivate).toHaveBeenCalledTimes(1);
  });

  test('sendMessage publishes to destination', () => {
    const { result } = renderHook(() => useLiveSession(1));
    act(() => { connectCallback(); });
    result.current.sendMessage('/app/answer', { answerId: 3 });
    expect(mockPublish).toHaveBeenCalledWith({
      destination: '/app/answer',
      body: JSON.stringify({ answerId: 3 }),
    });
  });

  test('sendMessage does nothing if not connected', () => {
    mockConnected = false;
    const { result } = renderHook(() => useLiveSession(1));
    result.current.sendMessage('/app/answer', { answerId: 3 });
    expect(mockPublish).not.toHaveBeenCalled();
    mockConnected = true;
  });

  test('reconnects when sessionId changes', () => {
    const { rerender } = renderHook(({ id }) => useLiveSession(id), {
      initialProps: { id: 1 },
    });
    expect(mockActivate).toHaveBeenCalledTimes(1);
    rerender({ id: 2 });
    expect(mockDeactivate).toHaveBeenCalledTimes(1);
    expect(mockActivate).toHaveBeenCalledTimes(2);
  });

  test('calls onDisconnect handler', () => {
    const onDisconnect = jest.fn();
    renderHook(() => useLiveSession(1, { onDisconnect }));
    act(() => { disconnectCallback(); });
    expect(onDisconnect).toHaveBeenCalled();
  });

  test('calls onError handler on STOMP error', () => {
    const onError = jest.fn();
    renderHook(() => useLiveSession(1, { onError }));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    act(() => { errorCallback({ headers: { message: 'err' } }); });
    expect(onError).toHaveBeenCalledWith({ headers: { message: 'err' } });
    consoleSpy.mockRestore();
  });
});
