let StateManager = (() => {
    let _currentState = undefined,
        _reducer = undefined,
        _listeners = [],
        _init_action = { type : '@@INIT/ACTION' };

    function getState(){
        return _currentState;
    }

    function subscribe(fn){
        _listeners.push(fn)
    }

    function _notifyStateChange(){
        for(let listenerFn of _listeners){
            listenerFn()
        }
    }

    function dispatch(action){
        let newState = _reducer(_currentState, action);
        if (_currentState === newState) return;
        _currentState =newState;
        _notifyStateChange()
    }

    function createStore(reducer){
        if (!reducer) throw new Error('a reducer is mandatory to create the store!')
        _reducer = reducer;
        _currentState = _reducer(undefined, _init_action);
        let store = { getState, subscribe, dispatch}
        return store;
    }

    return { createStore };
})()