//Validation Functions
const isEmpty = (string) => {
  if (string.trim() === "") {
    return true;
  } else {
    return false;
  }
};

const isEmail = (email) => {
  const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(String(email).toLowerCase());
};

exports.ValidateSignupData = (newUser) => {
  let errors = {};

  if (isEmpty(newUser.email)) {
    errors.email = "Must not be empty";
  } else if (!isEmail(newUser.email)) {
    errors.email = "Must be a valid email";
  }
  if (isEmpty(newUser.password)) errors.password = "Must not be empty";
  if (newUser.password !== newUser.confirmPassword)
    errors.confirmPassword = "Most be the same password";
  if (isEmpty(newUser.handle)) errors.handle = "Must not be empty";

  return {
    errors,
    valid: Object.keys(errors).length === 0 ? true : false,
  };
};

exports.ValidateLoginData = (user) => {
  let errors = {};
  if (user.email === undefined || user.password === undefined) {
    errors.general = "Error form values";
  } else {
    if (isEmpty(user.email.trim())) {
      errors.email = "Must not be empty";
    } else {
      if (!isEmail(user.email)) {
        errors.email = "Must be a email format";
      }
    }
    if (isEmpty(user.password.trim())) {
      errors.password = "Must not be empty";
    }
  }

  console.log(errors);
  return {
    errors,
    valid: Object.keys(errors).length === 0 ? true : false,
  };
};

exports.ReduceUserDetails = (data) => {
  let userDetails = {};

  if (!isEmpty(data.bio)) {
    userDetails.bio = data.bio;
  }

  if (!isEmpty(data.website)) {
    // https://
    if (data.website.trim().substring(0, 4) !== "http") {
      userDetails.website = `http://${data.website.trim()}`;
    } else {
      userDetails.website = data.website;
    }
  }
  if (!isEmpty(data.location)) {
    userDetails.location = data.location;
  }
  if (!isEmpty(data.FCMtoken)) {
    userDetails.FCMtoken = [data.FCMtoken];
  }

  return userDetails;
};
