var Account, Topic, User, store, env;
var run = Ember.run;

var attr = DS.attr;
var hasMany = DS.hasMany;

function stringify(string) {
  return function() { return string; };
}

module('integration/relationships/many_to_many_test - ManyToMany relationships', {
  setup: function() {
    User = DS.Model.extend({
      name: attr('string'),
      topics: hasMany('topic', { async: true }),
      accounts: hasMany('account')
    });

    User.toString = stringify('User');

    Account = DS.Model.extend({
      state: attr(),
      users: hasMany('user')
    });

    Account.toString = stringify('Account');

    Topic = DS.Model.extend({
      title: attr('string'),
      users: hasMany('user', { async: true })
    });

    Topic.toString = stringify('Topic');

    env = setupStore({
      user: User,
      topic: Topic,
      account: Account
    });

    store = env.store;
  },

  teardown: function() {
    run(function() {
      env.container.destroy();
    });
  }
});

/*
  Server loading tests
*/

test("Loading from one hasMany side reflects on the other hasMany side - async", function () {
  run(function() {
    store.push('user', { id: 1, name: 'Stanley', topics: [2, 3] });
  });
  var topic = run(function() {
    return store.push('topic', { id: 2, title: 'EmberFest was great' });
  });
  run(function() {
    topic.get('users').then(async(function(fetchedUsers) {
      equal(fetchedUsers.get('length'), 1, 'User relationship was set up correctly');
    }));
  });
});

test("Relationship is available from the belongsTo side even if only loaded from the hasMany side - sync", function () {
  var account;
  run(function() {
    account = store.push('account', { id: 2 , state: 'lonely' });
    store.push('user', { id: 1, name: 'Stanley', accounts: [2] });
  });
  run(function() {
    equal(account.get('users.length'), 1, 'User relationship was set up correctly');
  });
});

test("Fetching a hasMany where a record was removed reflects on the other hasMany side - async", function () {
  var user, topic;
  run(function() {
    user = store.push('user', { id: 1, name: 'Stanley', topics: [2] });
    topic = store.push('topic', { id: 2, title: 'EmberFest was great', users: [] });
  });
  run(function() {
    user.get('topics').then(async(function(fetchedTopics) {
      equal(fetchedTopics.get('length'), 0, 'Topics were removed correctly');
      equal(fetchedTopics.objectAt(0), null, "Topics can't be fetched");
      topic.get('users').then(async(function(fetchedUsers) {
        equal(fetchedUsers.get('length'), 0, 'Users were removed correctly');
        equal(fetchedUsers.objectAt(0), null, "User can't be fetched");
      }));
    }));
  });
});

test("Fetching a hasMany where a record was removed reflects on the other hasMany side - async", function () {
  var account, user;
  run(function() {
    account = store.push('account', { id: 2 , state: 'lonely' });
    user = store.push('user', { id: 1, name: 'Stanley', accounts: [2] });
    account = store.push('account', { id: 2 , state: 'lonely', users: [] });
  });
  equal(user.get('accounts.length'), 0, 'Accounts were removed correctly');
  equal(account.get('users.length'), 0, 'Users were removed correctly');
});

/*
  Local edits
*/

test("Pushing to a hasMany reflects on the other hasMany side - async", function () {
  expect(1);
  var user, topic;

  run(function() {
    user = store.push('user', { id: 1, name: 'Stanley', topics: [] });
    topic = store.push('topic', { id: 2, title: 'EmberFest was great' });
  });
  run(function() {
    topic.get('users').then(async(function(fetchedUsers) {
      fetchedUsers.pushObject(user);
      user.get('topics').then(async(function(fetchedTopics) {
        equal(fetchedTopics.get('length'), 1, 'User relationship was set up correctly');
      }));
    }));
  });
});

test("Pushing to a hasMany reflects on the other hasMany side - sync", function () {
  var account, stanley;
  run(function() {
    account = store.push('account', { id: 2 , state: 'lonely' });
    stanley = store.push('user', { id: 1, name: 'Stanley' });
    stanley.get('accounts').pushObject(account);
  });
  equal(account.get('users.length'), 1, 'User relationship was set up correctly');
});

test("Removing a record from a hasMany reflects on the other hasMany side - async", function () {
  var user, topic;
  run(function() {
    user = store.push('user', { id: 1, name: 'Stanley', topics: [2] });
    topic = store.push('topic', { id: 2, title: 'EmberFest was great' });
  });
  run(function() {
    user.get('topics').then(async(function(fetchedTopics) {
      equal(fetchedTopics.get('length'), 1, 'Topics were setup correctly');
      fetchedTopics.removeObject(topic);
      topic.get('users').then(async(function(fetchedUsers) {
        equal(fetchedUsers.get('length'), 0, 'Users were removed correctly');
        equal(fetchedUsers.objectAt(0), null, "User can't be fetched");
      }));
    }));
  });
});

test("Removing a record from a hasMany reflects on the other hasMany side - sync", function () {
  var account, user;
  run(function() {
    account = store.push('account', { id: 2 , state: 'lonely' });
    user = store.push('user', { id: 1, name: 'Stanley', accounts: [2] });
  });
  equal(account.get('users.length'), 1, 'Users were setup correctly');
  run(function() {
    account.get('users').removeObject(user);
  });
  equal(user.get('accounts.length'), 0, 'Accounts were removed correctly');
  equal(account.get('users.length'), 0, 'Users were removed correctly');
});

/*
Deleting tests
*/

test("Deleting a record that has a hasMany relationship removes it from the otherMany array but does not remove the other record from itself - async", function () {
  var user, topic;
  run(function() {
    user = store.push('user', { id: 1, name: 'Stanley', topics: [2] });
    topic = store.push('topic', { id: 2, title: 'EmberFest was great' });
  });
  run(topic, 'deleteRecord');
  run(function() {
    topic.get('users').then(async(function(fetchedUsers) {
      equal(fetchedUsers.get('length'), 1, 'Users are still there');
    }));
    user.get('topics').then(async(function(fetchedTopics) {
      equal(fetchedTopics.get('length'), 0, 'Topic got removed from the user');
      equal(fetchedTopics.objectAt(0), null, "Topic can't be fetched");
    }));
  });
});

test("Deleting a record that has a hasMany relationship removes it from the otherMany array but does not remove the other record from itself - sync", function () {
  var account, user;
  run(function() {
    account = store.push('account', { id: 2 , state: 'lonely' });
    user = store.push('user', { id: 1, name: 'Stanley', accounts: [2] });
  });
  run(account, 'deleteRecord');
  equal(account.get('users.length'), 1, 'Users are still there');
  equal(user.get('accounts.length'), 0, 'Acocount got removed from the user');
});

/*
  Rollback Attributes tests
*/

test("Rollbacking attributes for a deleted record that has a ManyToMany relationship works correctly - async", function () {
  var user, topic;
  run(function() {
    user = store.push('user', { id: 1, name: 'Stanley', topics: [2] });
    topic = store.push('topic', { id: 2, title: 'EmberFest was great' });
  });
  run(function() {
    topic.deleteRecord();
    topic.rollbackAttributes();
  });
  run(function() {
    topic.get('users').then(async(function(fetchedUsers) {
      equal(fetchedUsers.get('length'), 1, 'Users are still there');
    }));
    user.get('topics').then(async(function(fetchedTopics) {
      equal(fetchedTopics.get('length'), 1, 'Topic got rollbacked into the user');
    }));
  });
});

test("Deleting a record that has a hasMany relationship removes it from the otherMany array but does not remove the other record from itself - sync", function () {
  var account, user;
  run(function() {
    account = store.push('account', { id: 2 , state: 'lonely' });
    user = store.push('user', { id: 1, name: 'Stanley', accounts: [2] });
  });
  run(function() {
    account.deleteRecord();
    account.rollbackAttributes();
  });
  equal(account.get('users.length'), 1, 'Users are still there');
  equal(user.get('accounts.length'), 1, 'Account got rolledback correctly into the user');
});

test("Rollbacking attributes for a created record that has a ManyToMany relationship works correctly - async", function () {
  var user, topic;
  run(function() {
    user = store.push('user', { id: 1, name: 'Stanley' });
    topic = store.createRecord('topic');
  });
  run(function() {
    user.get('topics').then(async(function(fetchedTopics) {
      fetchedTopics.pushObject(topic);
      topic.rollbackAttributes();
      topic.get('users').then(async(function(fetchedUsers) {
        equal(fetchedUsers.get('length'), 0, 'Users got removed');
        equal(fetchedUsers.objectAt(0), null, "User can't be fetched");
      }));
      user.get('topics').then(async(function(fetchedTopics) {
        equal(fetchedTopics.get('length'), 0, 'Topics got removed');
        equal(fetchedTopics.objectAt(0), null, "Topic can't be fetched");
      }));
    }));
  });
});

test("Deleting a record that has a hasMany relationship removes it from the otherMany array but does not remove the other record from itself - sync", function () {
  var account, user;
  run(function() {
    account = store.push('account', { id: 2 , state: 'lonely' });
    user = store.createRecord('user');
  });
  run(function() {
    account.get('users').pushObject(user);
    user.rollbackAttributes();
  });
  equal(account.get('users.length'), 0, 'Users got removed');
  equal(user.get('accounts.length'), undefined, 'Accounts got rolledback correctly');
});


test("Re-loading a removed record should re add it to the relationship when the removed record is the last one in the relationship", function () {
  var account, ada, byron;
  run(function() {
    account = store.push('account', { id: 2 , state: 'account 1' });
    ada = store.push('user', { id: 1, name: 'Ada Lovelace', accounts: [2] });
    byron = store.push('user', { id: 2, name: 'Lord Byron', accounts: [2] });
    account.get('users').removeObject(byron);
    account = store.push('account', { id: 2 , state: 'account 1', users: [1, 2] });
  });

  equal(account.get('users.length'), 2, 'Accounts were updated correctly');
});
