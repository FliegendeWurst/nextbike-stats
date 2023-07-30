use std::collections::HashMap;

use rusqlite::{params, Connection};
use serde_json::json;

fn main() {
	let db = Connection::open("nextbike.db").unwrap();
	let mut results = db.prepare("SELECT uid, time, lat, lng FROM pos").unwrap();

	let mut bikes: HashMap<_, Vec<_>> = HashMap::new();

	for (uid, time, lat, lng) in results
		.query_map(params![], |row| {
			Ok((
				row.get::<_, u64>(0).unwrap(),
				row.get::<_, u64>(1).unwrap(),
				row.get::<_, f64>(2).unwrap(),
				row.get::<_, f64>(3).unwrap(),
			))
		})
		.unwrap()
		.map(Result::unwrap)
	{
		bikes.entry(uid).or_default().push((time, lat, lng));
	}
	let mut data = json!({"bikes": []});
	for (bike_id, mut ts) in bikes {
		if ts.len() != 2 {
			continue;
		}
		ts.sort_by_key(|x| x.0);
		data.get_mut("bikes")
			.unwrap()
			.as_array_mut()
			.unwrap()
			.push(json!({"n": bike_id, "d": ts}));
	}
	println!("{}", data);
}
